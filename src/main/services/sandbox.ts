import { exec, execFile } from 'node:child_process'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'
import type { SandboxEntry, SandboxInfo } from '../../shared/types'
import { appNodeModules, sandboxDir } from './paths'

const MAX_OUTPUT = 32_000

export async function ensureSandbox(): Promise<string> {
  const root = sandboxDir()
  await mkdir(root, { recursive: true })
  return root
}

/** Resolve a sandbox-relative (or absolute-within-sandbox) path, refusing escapes. */
export function resolveSandboxPath(path: string): string {
  const root = sandboxDir()
  const target = resolve(root, path.replace(/^[/\\]+/, ''))
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error(`Path escapes the sandbox: ${path}`)
  }
  return target
}

const DENIED_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /\bsudo\b|\bdoas\b/, reason: 'privilege escalation is not allowed' },
  { re: /\brm\s+(-[a-zA-Z]+\s+)*["']?[/~]/, reason: 'deleting outside the sandbox is not allowed' },
  { re: /\b(shutdown|reboot|poweroff|halt)\b/, reason: 'system power commands are not allowed' },
  { re: /\bmkfs\b|\bfdisk\b|\bdd\s+[^|]*of=\/dev\//, reason: 'disk-level commands are not allowed' },
  { re: /:\(\)\s*\{.*\}\s*;\s*:/, reason: 'fork bombs are not allowed' },
  { re: /\bchown\s+(-[a-zA-Z]+\s+)*["']?\//, reason: 'changing ownership outside the sandbox is not allowed' },
  { re: />\s*\/(etc|dev|usr|bin|sbin|boot|sys|proc)\b/, reason: 'writing to system paths is not allowed' },
  { re: /\bkill(all)?\s+(-9\s+)?1\b/, reason: 'killing system processes is not allowed' }
]

export function guardCommand(command: string): string | null {
  for (const { re, reason } of DENIED_PATTERNS) {
    if (re.test(command)) return `Blocked: ${reason}.`
  }
  return null
}

export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

function truncate(text: string): string {
  if (text.length <= MAX_OUTPUT) return text
  return `${text.slice(0, MAX_OUTPUT)}\n... [output truncated at ${MAX_OUTPUT} characters]`
}

export async function execBash(command: string, timeoutSeconds = 60): Promise<ExecResult> {
  const blocked = guardCommand(command)
  if (blocked) return { stdout: '', stderr: blocked, exitCode: 1 }
  const cwd = await ensureSandbox()

  return new Promise((resolvePromise) => {
    exec(
      command,
      {
        cwd,
        timeout: Math.min(Math.max(timeoutSeconds, 1), 300) * 1000,
        maxBuffer: 8 * 1024 * 1024,
        shell: process.platform === 'win32' ? undefined : '/bin/bash',
        env: { ...process.env, MONDAINAI_SANDBOX: cwd }
      },
      (error, stdout, stderr) => {
        const rawCode: unknown = error ? (error as { code?: unknown }).code : 0
        resolvePromise({
          stdout: truncate(stdout.toString()),
          stderr: truncate(stderr.toString() + (error && error.killed ? '\n[command timed out]' : '')),
          exitCode: typeof rawCode === 'number' ? rawCode : error ? 1 : 0
        })
      }
    )
  })
}

/**
 * Runs a JavaScript snippet with Node (Electron re-launched as Node), cwd in the
 * sandbox. NODE_PATH exposes the app's node_modules so `require('pptxgenjs')`
 * and `require('xlsx')` work for generating documents.
 */
export async function runNodeScript(code: string, timeoutSeconds = 120): Promise<ExecResult> {
  const cwd = await ensureSandbox()
  const scriptPath = join(cwd, `.mondainai-run-${Date.now()}.cjs`)
  await writeFile(scriptPath, code, 'utf8')

  return new Promise((resolvePromise) => {
    execFile(
      process.execPath,
      [scriptPath],
      {
        cwd,
        timeout: Math.min(Math.max(timeoutSeconds, 1), 300) * 1000,
        maxBuffer: 8 * 1024 * 1024,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          NODE_PATH: appNodeModules()
        }
      },
      (error, stdout, stderr) => {
        rm(scriptPath, { force: true }).catch(() => {})
        resolvePromise({
          stdout: truncate(stdout.toString()),
          stderr: truncate(stderr.toString() + (error && error.killed ? '\n[script timed out]' : '')),
          exitCode: error ? 1 : 0
        })
      }
    )
  })
}

export async function writeSandboxFile(
  path: string,
  content: string,
  encoding: 'utf8' | 'base64' = 'utf8'
): Promise<string> {
  const target = resolveSandboxPath(path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, encoding === 'base64' ? Buffer.from(content, 'base64') : content)
  return target
}

export async function readSandboxFile(path: string): Promise<string> {
  const target = resolveSandboxPath(path)
  const s = await stat(target)
  if (s.size > 512 * 1024) throw new Error(`File too large to read (${s.size} bytes)`)
  return truncate(await readFile(target, 'utf8'))
}

async function walk(dir: string, base: string, out: SandboxEntry[], depth = 0): Promise<void> {
  if (depth > 6 || out.length > 500) return
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const abs = join(dir, entry.name)
    const rel = base ? `${base}/${entry.name}` : entry.name
    const s = await stat(abs)
    if (entry.isDirectory()) {
      out.push({ path: rel, name: entry.name, type: 'dir', size: 0, updatedAt: s.mtimeMs })
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        await walk(abs, rel, out, depth + 1)
      }
    } else {
      out.push({ path: rel, name: entry.name, type: 'file', size: s.size, updatedAt: s.mtimeMs })
    }
  }
}

export async function listSandbox(): Promise<SandboxEntry[]> {
  const root = await ensureSandbox()
  const out: SandboxEntry[] = []
  await walk(root, '', out)
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

export async function sandboxInfo(): Promise<SandboxInfo> {
  const root = await ensureSandbox()
  const entries = await listSandbox()
  return {
    root,
    fileCount: entries.filter((e) => e.type === 'file').length,
    totalSize: entries.reduce((sum, e) => sum + e.size, 0)
  }
}

export async function resetSandbox(): Promise<void> {
  const root = sandboxDir()
  await rm(root, { recursive: true, force: true })
  await mkdir(root, { recursive: true })
}
