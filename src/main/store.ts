import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type StoredChat = {
  id: string
  title: string
  visibility: 'public' | 'private'
  createdAt: string
  updatedAt: string
  unread?: boolean
}

export type StoredMessage = {
  id: string
  chatId: string
  role: 'user' | 'assistant' | 'system'
  parts: unknown[]
  attachments: unknown[]
  createdAt: string
}

type DbShape = {
  chats: StoredChat[]
  messages: StoredMessage[]
}

let db: DbShape = { chats: [], messages: [] }
let filePath = ''
let writeTimer: NodeJS.Timeout | null = null

export function initStore(): void {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  filePath = join(dir, 'chat-data.json')
  if (existsSync(filePath)) {
    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<DbShape>
      db = { chats: parsed.chats ?? [], messages: parsed.messages ?? [] }
    } catch {
      db = { chats: [], messages: [] }
    }
  }
}

function persist(): void {
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    try {
      writeFileSync(filePath, JSON.stringify(db))
    } catch {

    }
  }, 150)
}

export function getChatById(id: string): StoredChat | null {
  return db.chats.find((c) => c.id === id) ?? null
}

export function saveChat(chat: Omit<StoredChat, 'createdAt' | 'updatedAt'>): StoredChat {
  const now = new Date().toISOString()
  const existing = getChatById(chat.id)
  if (existing) {
    Object.assign(existing, chat, { updatedAt: now })
    persist()
    return existing
  }
  const created: StoredChat = { ...chat, createdAt: now, updatedAt: now }
  db.chats.push(created)
  persist()
  return created
}

export function updateChatTitle(id: string, title: string): void {
  const chat = getChatById(id)
  if (!chat) return
  chat.title = title
  chat.updatedAt = new Date().toISOString()
  persist()
}

export function markChatAsRead(id: string): void {
  const chat = getChatById(id)
  if (!chat) return
  chat.unread = false
  persist()
}

export function deleteChatById(id: string): void {
  db.chats = db.chats.filter((c) => c.id !== id)
  db.messages = db.messages.filter((m) => m.chatId !== id)
  persist()
}

export function getHistory(params: { limit: number; endingBefore?: string | null }): {
  chats: StoredChat[]
  hasMore: boolean
} {
  const sorted = [...db.chats].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  let start = 0
  if (params.endingBefore) {
    const idx = sorted.findIndex((c) => c.id === params.endingBefore)
    if (idx !== -1) start = idx + 1
  }
  const page = sorted.slice(start, start + params.limit)
  return { chats: page, hasMore: start + params.limit < sorted.length }
}

export function getMessagesByChatId(chatId: string): StoredMessage[] {
  return db.messages
    .filter((m) => m.chatId === chatId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

export function saveMessages(messages: Omit<StoredMessage, 'createdAt'>[]): void {
  const now = new Date().toISOString()
  for (const m of messages) {
    if (db.messages.some((existing) => existing.id === m.id)) continue
    db.messages.push({ ...m, createdAt: now })
  }
  persist()
}
