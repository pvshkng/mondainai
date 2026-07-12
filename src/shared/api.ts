import type {
  AppSettings,
  ChatEvent,
  ChatSendPayload,
  ConversationEntry,
  ImportResult,
  MemoryFileInfo,
  MemoryFileName,
  SandboxEntry,
  SandboxInfo,
  SkillMeta
} from './types'

/** The IPC surface the preload script exposes on window.api. */
export interface MondainaiApi {
  settings: {
    get: () => Promise<AppSettings>
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>
  }
  chat: {
    send: (payload: ChatSendPayload) => Promise<void>
    stop: () => Promise<void>
    reset: () => Promise<void>
    onEvent: (callback: (ev: ChatEvent) => void) => () => void
  }
  memory: {
    info: () => Promise<MemoryFileInfo[]>
    read: (file: MemoryFileName) => Promise<string>
    write: (file: MemoryFileName, content: string) => Promise<void>
    conversations: (limit?: number) => Promise<ConversationEntry[]>
    clearConversations: () => Promise<void>
    search: (query: string) => Promise<string>
  }
  skills: {
    list: () => Promise<SkillMeta[]>
    read: (name: string) => Promise<{ meta: SkillMeta; content: string }>
    setEnabled: (name: string, enabled: boolean) => Promise<void>
    remove: (name: string) => Promise<void>
    importGithub: (url: string) => Promise<ImportResult>
    importFolder: () => Promise<ImportResult>
  }
  sandbox: {
    info: () => Promise<SandboxInfo>
    list: () => Promise<SandboxEntry[]>
    readFile: (path: string) => Promise<string>
    readFileBase64: (path: string) => Promise<string>
    /** Save-as dialog for a sandbox file; returns the destination path or null if cancelled. */
    saveFileAs: (path: string, suggestedName: string) => Promise<string | null>
    reset: () => Promise<void>
    openFolder: () => Promise<void>
  }
}
