import { exec, execFile, type ChildProcess } from 'node:child_process'
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, resolve, sep } from 'node:path'
import type { ArtifactInfo, ArtifactKind, SandboxEntry, SandboxInfo } from '../../shared/types'
import { appNodeModules, sandboxDir } from './paths'

const MAX_OUTPUT = 32_000

// Live child processes spawned by the sandbox (bash / node runs). Tracked so
// they can be killed when the app shuts down instead of being orphaned.
const liveProcesses = new Set<ChildProcess>()

function trackProcess(child: ChildProcess): void {
  liveProcesses.add(child)
  child.once('exit', () => liveProcesses.delete(child))
}

/** Kill every child process still running in the sandbox. Called on app quit. */
export function killSandboxProcesses(): void {
  for (const child of liveProcesses) {
    try {
      child.kill('SIGKILL')
    } catch {
      // process already gone; ignore
    }
  }
  liveProcesses.clear()
}

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
    const child = exec(
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
    trackProcess(child)
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
    const child = execFile(
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
    trackProcess(child)
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

const MAX_BINARY_READ = 30 * 1024 * 1024

/** Read a sandbox file as base64 (for previewing binary artifacts in the renderer). */
export async function readSandboxFileBase64(path: string): Promise<string> {
  const target = resolveSandboxPath(path)
  const s = await stat(target)
  if (s.size > MAX_BINARY_READ) throw new Error(`File too large to preview (${s.size} bytes)`)
  return (await readFile(target)).toString('base64')
}

const EXTENSION_KINDS: Record<string, { kind: ArtifactKind; mediaType: string }> = {
  '.xlsx': { kind: 'excel', mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  '.xls': { kind: 'excel', mediaType: 'application/vnd.ms-excel' },
  '.pptx': { kind: 'powerpoint', mediaType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  '.ppt': { kind: 'powerpoint', mediaType: 'application/vnd.ms-powerpoint' },
  '.docx': { kind: 'word', mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '.doc': { kind: 'word', mediaType: 'application/msword' },
  '.pdf': { kind: 'pdf', mediaType: 'application/pdf' },
  '.png': { kind: 'image', mediaType: 'image/png' },
  '.jpg': { kind: 'image', mediaType: 'image/jpeg' },
  '.jpeg': { kind: 'image', mediaType: 'image/jpeg' },
  '.gif': { kind: 'image', mediaType: 'image/gif' },
  '.webp': { kind: 'image', mediaType: 'image/webp' },
  '.svg': { kind: 'image', mediaType: 'image/svg+xml' },
  '.csv': { kind: 'csv', mediaType: 'text/csv' },
  '.md': { kind: 'text', mediaType: 'text/markdown' },
  '.txt': { kind: 'text', mediaType: 'text/plain' },
  '.json': { kind: 'text', mediaType: 'application/json' },
  '.html': { kind: 'text', mediaType: 'text/html' },
  '.js': { kind: 'text', mediaType: 'text/javascript' },
  '.ts': { kind: 'text', mediaType: 'text/typescript' },
  '.css': { kind: 'text', mediaType: 'text/css' }
}

/** Stat a sandbox file and describe it as a shareable artifact. */
export async function statSandboxArtifact(path: string): Promise<ArtifactInfo> {
  const target = resolveSandboxPath(path)
  const s = await stat(target)
  if (!s.isFile()) throw new Error(`Not a file: ${path}`)
  const meta = EXTENSION_KINDS[extname(target).toLowerCase()] ?? {
    kind: 'other' as ArtifactKind,
    mediaType: 'application/octet-stream'
  }
  const rel = target === sandboxDir() ? '' : target.slice(sandboxDir().length + 1).split(sep).join('/')
  return { path: rel, name: basename(target), size: s.size, ...meta }
}

/** Copy a sandbox file to a destination outside the sandbox (user "save as"). */
export async function exportSandboxFile(path: string, destination: string): Promise<void> {
  const source = resolveSandboxPath(path)
  await copyFile(source, destination)
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
