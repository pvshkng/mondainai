import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ImportResult, SkillMeta } from '../../shared/types'
import { skillsDir, skillsStatePath } from './paths'

const execFileAsync = promisify(execFile)

interface SkillsState {
  disabled: string[]
  sources: Record<string, string>
}

async function readState(): Promise<SkillsState> {
  try {
    const raw = await readFile(skillsStatePath(), 'utf8')
    const parsed = JSON.parse(raw)
    return { disabled: parsed.disabled ?? [], sources: parsed.sources ?? {} }
  } catch {
    return { disabled: [], sources: {} }
  }
}

async function writeState(state: SkillsState): Promise<void> {
  await writeFile(skillsStatePath(), JSON.stringify(state, null, 2), 'utf8')
}

/** Minimal YAML frontmatter parser — handles `key: value` lines with optional quotes. */
export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match?.[1]) throw new Error('No frontmatter found in SKILL.md')
  const result: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!m) continue
    let value = m[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    result[m[1]] = value
  }
  return result
}

export function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return match ? content.slice(match[0].length).trim() : content.trim()
}

async function listSkillFiles(dir: string, base = '', depth = 0): Promise<string[]> {
  if (depth > 3) return []
  const out: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      out.push(...(await listSkillFiles(join(dir, entry.name), rel, depth + 1)))
    } else {
      out.push(rel)
    }
    if (out.length > 200) break
  }
  return out
}

export async function ensureSkillsDir(): Promise<void> {
  await mkdir(skillsDir(), { recursive: true })
}

export async function discoverSkills(): Promise<SkillMeta[]> {
  await ensureSkillsDir()
  const state = await readState()
  const skills: SkillMeta[] = []
  const entries = await readdir(skillsDir(), { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const dir = join(skillsDir(), entry.name)
    try {
      const content = await readFile(join(dir, 'SKILL.md'), 'utf8')
      const fm = parseFrontmatter(content)
      const name = fm.name || entry.name
      if (skills.some((s) => s.name === name)) continue
      skills.push({
        name,
        description: fm.description || '(no description)',
        path: dir,
        enabled: !state.disabled.includes(name),
        source: state.sources[entry.name] ?? 'local',
        files: await listSkillFiles(dir)
      })
    } catch {
      continue // skip folders without a valid SKILL.md
    }
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

export async function readSkill(name: string): Promise<{ meta: SkillMeta; content: string }> {
  const skills = await discoverSkills()
  const skill = skills.find((s) => s.name.toLowerCase() === name.toLowerCase())
  if (!skill) throw new Error(`Skill '${name}' not found`)
  const content = await readFile(join(skill.path, 'SKILL.md'), 'utf8')
  return { meta: skill, content }
}

export async function setSkillEnabled(name: string, enabled: boolean): Promise<void> {
  const state = await readState()
  const disabled = new Set(state.disabled)
  if (enabled) disabled.delete(name)
  else disabled.add(name)
  await writeState({ ...state, disabled: [...disabled] })
}

export async function removeSkill(name: string): Promise<void> {
  const skills = await discoverSkills()
  const skill = skills.find((s) => s.name === name)
  if (!skill) throw new Error(`Skill '${name}' not found`)
  await rm(skill.path, { recursive: true, force: true })
  const state = await readState()
  delete state.sources[basename(skill.path)]
  state.disabled = state.disabled.filter((n) => n !== name)
  await writeState(state)
}

function sanitizeDirName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'skill'
}

/** Copy one skill folder (must contain SKILL.md) into the local skills dir. */
async function installSkillFolder(srcDir: string, source: string): Promise<string> {
  const content = await readFile(join(srcDir, 'SKILL.md'), 'utf8')
  const fm = parseFrontmatter(content)
  const name = fm.name || basename(srcDir)
  const dirName = sanitizeDirName(name)
  const dest = join(skillsDir(), dirName)
  await rm(dest, { recursive: true, force: true })
  await cp(srcDir, dest, {
    recursive: true,
    filter: (src) => !src.includes(`${join(srcDir, '.git')}`)
  })
  const state = await readState()
  state.sources[dirName] = source
  await writeState(state)
  return name
}

/** Find directories containing a SKILL.md, up to a shallow depth. */
async function findSkillDirs(root: string, depth = 0): Promise<string[]> {
  const found: string[] = []
  try {
    await stat(join(root, 'SKILL.md'))
    found.push(root)
    return found
  } catch {
    // not a skill dir itself — scan children
  }
  if (depth >= 3) return found
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue
    found.push(...(await findSkillDirs(join(root, entry.name), depth + 1)))
    if (found.length > 50) break
  }
  return found
}

interface GithubRef {
  cloneUrl: string
  branch?: string
  subPath?: string
}

export function parseGithubUrl(input: string): GithubRef {
  const trimmed = input.trim().replace(/\/+$/, '')
  // owner/repo shorthand
  const shorthand = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (shorthand) {
    return { cloneUrl: `https://github.com/${shorthand[1]}/${shorthand[2]}.git` }
  }
  const url = new URL(trimmed)
  if (!/(^|\.)github\.com$/.test(url.hostname)) {
    throw new Error('Only github.com URLs are supported')
  }
  const parts = url.pathname.replace(/^\/+/, '').split('/')
  if (parts.length < 2) throw new Error('URL must include owner and repository')
  const owner = parts[0]
  const repo = parts[1].replace(/\.git$/, '')
  const ref: GithubRef = { cloneUrl: `https://github.com/${owner}/${repo}.git` }
  if (parts[2] === 'tree' && parts.length >= 4) {
    ref.branch = parts[3]
    if (parts.length > 4) ref.subPath = parts.slice(4).join('/')
  }
  return ref
}

export async function importSkillsFromGithub(input: string): Promise<ImportResult> {
  await ensureSkillsDir()
  const ref = parseGithubUrl(input)
  const tmp = await mkdtemp(join(tmpdir(), 'mondainai-skill-'))
  const result: ImportResult = { imported: [], errors: [] }
  try {
    const args = ['clone', '--depth', '1']
    if (ref.branch) args.push('--branch', ref.branch)
    args.push(ref.cloneUrl, tmp)
    await execFileAsync('git', args, { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 })

    const scanRoot = ref.subPath ? join(tmp, ref.subPath) : tmp
    const dirs = await findSkillDirs(scanRoot)
    if (dirs.length === 0) {
      result.errors.push('No SKILL.md found in the repository (searched 3 levels deep).')
      return result
    }
    for (const dir of dirs) {
      try {
        result.imported.push(await installSkillFolder(dir, input.trim()))
      } catch (err) {
        result.errors.push(`${basename(dir)}: ${(err as Error).message}`)
      }
    }
    return result
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

export async function importSkillsFromFolder(folder: string): Promise<ImportResult> {
  await ensureSkillsDir()
  const result: ImportResult = { imported: [], errors: [] }
  const dirs = await findSkillDirs(folder)
  if (dirs.length === 0) {
    result.errors.push('No SKILL.md found in the selected folder.')
    return result
  }
  for (const dir of dirs) {
    try {
      result.imported.push(await installSkillFolder(dir, `folder: ${folder}`))
    } catch (err) {
      result.errors.push(`${basename(dir)}: ${(err as Error).message}`)
    }
  }
  return result
}
