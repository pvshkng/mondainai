import type {
  AppSettings,
  ChatAnswersPayload,
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

/** State of the main window's maximize/restore toggle. */
export interface WindowState {
  isMaximized: boolean
}

/** The IPC surface the preload script exposes on window.api. */
export interface MondainaiApi {
  settings: {
    get: () => Promise<AppSettings>
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>
  }
  window: {
    minimize: () => void
    toggleMaximize: () => void
    /** Current maximize state, for initialising the custom title bar. */
    getState: () => Promise<WindowState>
    /**
     * Ask the main process to handle a close request. Depending on the saved
     * close behaviour it will minimize to tray, quit, or ask the renderer to
     * show the confirmation dialog (via {@link onShowClosePrompt}).
     */
    requestClose: () => void
    /** Hide the window to the system tray, keeping the app running. */
    hideToTray: () => void
    /** Close all connections / pending work, then quit the app. */
    quit: () => void
    /** Subscribe to maximize/restore changes; returns an unsubscribe fn. */
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
    /** The main process asks the renderer to show the close confirmation dialog. */
    onShowClosePrompt: (callback: () => void) => () => void
  }
  chat: {
    send: (chatId: string, payload: ChatSendPayload) => Promise<void>
    stop: (chatId: string) => Promise<void>
    reset: (chatId: string) => Promise<void>
    answer: (chatId: string, payload: ChatAnswersPayload) => Promise<void>
    onEvent: (callback: (chatId: string, ev: ChatEvent) => void) => () => void
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
