/**
 * What clicking the window's close button does.
 * - `ask`  — show the confirmation dialog every time (default)
 * - `tray` — always minimize to the system tray and keep running
 * - `quit` — always exit the app (after closing connections/tasks)
 */
export type CloseBehavior = 'ask' | 'tray' | 'quit'

export interface AppSettings {
  apiKey: string
  model: string
  closeBehavior: CloseBehavior
}

export const MODEL_OPTIONS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', contextWindow: 1_000_000 },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', contextWindow: 1_000_000 },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', contextWindow: 200_000 }
] as const

/** Context window (max input tokens) for a model id. */
export function contextWindowForModel(model: string): number {
  const option = MODEL_OPTIONS.find((m) => m.id === model)
  // Unknown/custom model ids fall back to the smallest window we support,
  // so the compactor errs on the safe side.
  return option?.contextWindow ?? 200_000
}

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

export interface ChatQuestionOption {
  label: string
  description?: string
}

export interface ChatQuestion {
  question: string
  /** short 1-2 word topic label shown as a chip above the question */
  header?: string
  multiSelect: boolean
  options: ChatQuestionOption[]
}

/** The user's answers to one ask_user_questions tool call. */
export interface ChatAnswersPayload {
  toolUseId: string
  /** answers[i] holds the selected and/or custom answers for questions[i] */
  answers: string[][]
}

export type AgentTaskStatus = 'pending' | 'in_progress' | 'completed'

export interface AgentTask {
  id: string
  title: string
  status: AgentTaskStatus
}

export type ArtifactKind =
  | 'excel'
  | 'powerpoint'
  | 'word'
  | 'pdf'
  | 'image'
  | 'csv'
  | 'text'
  | 'other'

export interface ArtifactInfo {
  /** sandbox-relative path */
  path: string
  name: string
  size: number
  mediaType: string
  kind: ArtifactKind
}

export type ChatEvent =
  | { type: 'start' }
  | { type: 'text'; delta: string }
  | { type: 'thinking' }
  | { type: 'tool_start'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; id: string; name: string; ok: boolean; summary: string }
  | { type: 'questions'; toolUseId: string; questions: ChatQuestion[] }
  | { type: 'plan'; tasks: AgentTask[] }
  | { type: 'artifact'; artifact: ArtifactInfo }
  | { type: 'context'; tokens: number; contextWindow: number }
  | { type: 'compaction'; phase: 'start' }
  | { type: 'compaction'; phase: 'done'; tokensBefore: number; tokensAfter: number }
  | { type: 'done'; text: string }
  | { type: 'error'; message: string }

export interface ImportResult {
  imported: string[]
  errors: string[]
}
