export interface AppSettings {
  apiKey: string
  model: string
}

export const MODEL_OPTIONS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }
] as const

export type MemoryFileName = 'core.md' | 'notes.md' | 'conversations.jsonl'

export interface MemoryFileInfo {
  file: MemoryFileName
  size: number
  updatedAt: number
}

export interface ConversationEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface SkillMeta {
  name: string
  description: string
  path: string
  enabled: boolean
  source: string
  files: string[]
}

export interface SandboxEntry {
  /** path relative to the sandbox root */
  path: string
  name: string
  type: 'file' | 'dir'
  size: number
  updatedAt: number
}

export interface SandboxInfo {
  root: string
  fileCount: number
  totalSize: number
}

export interface ChatAttachment {
  name: string
  mediaType: string
  dataBase64: string
}

export interface ChatSendPayload {
  text: string
  attachments: ChatAttachment[]
  /** names of skills the user selected as available for this message */
  activeSkills: string[]
}

export type ChatEvent =
  | { type: 'start' }
  | { type: 'text'; delta: string }
  | { type: 'thinking' }
  | { type: 'tool_start'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name: string; ok: boolean; summary: string }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string }

export interface ImportResult {
  imported: string[]
  errors: string[]
}
