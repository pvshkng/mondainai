import { access, appendFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import type { ConversationEntry, MemoryFileInfo, MemoryFileName } from '../../shared/types'
import { memoryDir } from './paths'

const MEMORY_FILES: MemoryFileName[] = ['core.md', 'notes.md', 'conversations.jsonl']

const DEFAULT_CORE_MEMORY = `# Core Memory

- Keep this file short and focused.
- Put stable, durable user facts here (name, preferences, ongoing projects).
`

const DEFAULT_NOTES = `# Notes

Use this file for detailed memories and timestamped notes.
`

function filePath(file: MemoryFileName): string {
  return join(memoryDir(), file)
}

async function ensureFile(path: string, content: string): Promise<void> {
  try {
    await access(path)
  } catch {
    await writeFile(path, content, 'utf8')
  }
}

export async function ensureMemoryFilesystem(): Promise<void> {
  await mkdir(memoryDir(), { recursive: true })
  await ensureFile(filePath('core.md'), DEFAULT_CORE_MEMORY)
  await ensureFile(filePath('notes.md'), DEFAULT_NOTES)
  await ensureFile(filePath('conversations.jsonl'), '')
}

export async function readMemoryFile(file: MemoryFileName): Promise<string> {
  if (!MEMORY_FILES.includes(file)) throw new Error(`Unknown memory file: ${file}`)
  await ensureMemoryFilesystem()
  return readFile(filePath(file), 'utf8')
}

export async function writeMemoryFile(file: MemoryFileName, content: string): Promise<void> {
  if (!MEMORY_FILES.includes(file)) throw new Error(`Unknown memory file: ${file}`)
  await ensureMemoryFilesystem()
  await writeFile(filePath(file), content, 'utf8')
}

export async function memoryInfo(): Promise<MemoryFileInfo[]> {
  await ensureMemoryFilesystem()
  const infos: MemoryFileInfo[] = []
  for (const file of MEMORY_FILES) {
    const s = await stat(filePath(file))
    infos.push({ file, size: s.size, updatedAt: s.mtimeMs })
  }
  return infos
}

export async function readCoreMemory(): Promise<string> {
  try {
    return await readMemoryFile('core.md')
  } catch {
    return ''
  }
}

export async function appendConversation(entry: ConversationEntry): Promise<void> {
  await ensureMemoryFilesystem()
  await appendFile(filePath('conversations.jsonl'), `${JSON.stringify(entry)}\n`, 'utf8')
}

export async function clearConversations(): Promise<void> {
  await ensureMemoryFilesystem()
  await writeFile(filePath('conversations.jsonl'), '', 'utf8')
}

export async function listConversations(limit = 200): Promise<ConversationEntry[]> {
  const raw = await readMemoryFile('conversations.jsonl')
  const lines = raw.split('\n').filter(Boolean)
  const entries: ConversationEntry[] = []
  for (const line of lines.slice(-limit)) {
    try {
      entries.push(JSON.parse(line))
    } catch {
      // skip malformed lines
    }
  }
  return entries
}

export async function searchMemory(query: string, scope?: MemoryFileName): Promise<string> {
  await ensureMemoryFilesystem()
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return 'No search terms provided.'
  const files = scope ? [scope] : MEMORY_FILES
  const matches: string[] = []

  for (const file of files) {
    const lines = (await readFile(filePath(file), 'utf8')).split('\n')
    for (const [i, line] of lines.entries()) {
      const lower = line.toLowerCase()
      if (terms.some((t) => lower.includes(t))) {
        matches.push(`${relative(memoryDir(), filePath(file))}:${i + 1}:${line}`)
      }
      if (matches.length >= 100) break
    }
  }
  return matches.length > 0 ? matches.join('\n') : 'No matches found.'
}

const MEMORY_PATH_ALIASES: Record<string, MemoryFileName> = {
  'core.md': 'core.md',
  'notes.md': 'notes.md',
  'conversations.jsonl': 'conversations.jsonl'
}

export function resolveMemoryName(path: string): MemoryFileName {
  const cleaned = path
    .trim()
    .replace(/^\/?memories\/?/, '')
    .replace(/^\/?\.memory\/?/, '')
    .replace(/^\/+/, '')
  const file = MEMORY_PATH_ALIASES[cleaned]
  if (!file) throw new Error(`Unsupported memory path: ${path}. Use core.md, notes.md or conversations.jsonl`)
  return file
}

export interface MemoryCommandInput {
  command: 'view' | 'create' | 'update' | 'search'
  path?: string
  content?: string
  mode?: 'append' | 'overwrite'
  query?: string
}

export async function runMemoryCommand(input: MemoryCommandInput): Promise<string> {
  const { command, path, content, mode, query } = input
  await ensureMemoryFilesystem()

  switch (command) {
    case 'view': {
      if (!path) throw new Error('path is required for view')
      return readMemoryFile(resolveMemoryName(path))
    }
    case 'create':
    case 'update': {
      if (!path) throw new Error('path is required')
      if (content === undefined) throw new Error('content is required')
      const file = resolveMemoryName(path)
      if (mode === 'append') {
        await appendFile(filePath(file), content.endsWith('\n') ? content : `${content}\n`, 'utf8')
      } else {
        await writeMemoryFile(file, content)
      }
      return `${command === 'create' ? 'Created' : 'Updated'} ${file}`
    }
    case 'search': {
      if (!query) throw new Error('query is required for search')
      return searchMemory(query, path ? resolveMemoryName(path) : undefined)
    }
    default:
      throw new Error(`Unknown memory command: ${String(command)}`)
  }
}
