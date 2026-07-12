import { Store } from '@tanstack/store'
import type { ChatEvent, ChatQuestion } from '../../../shared/types'

export type AssistantBlock =
  | { kind: 'text'; text: string }
  | {
      kind: 'tool'
      id: string
      name: string
      input: unknown
      done: boolean
      ok?: boolean
      summary?: string
    }
  | {
      kind: 'question'
      toolUseId: string
      questions: ChatQuestion[]
      /** null until the user submits; answers[i] belongs to questions[i] */
      answers: string[][] | null
    }
  | { kind: 'compaction'; done: boolean; tokensBefore?: number; tokensAfter?: number }
  | { kind: 'error'; message: string }

export type ChatMessage =
  | { role: 'user'; text: string; images: string[] }
  | { role: 'assistant'; blocks: AssistantBlock[] }

export type ChatStatus = 'idle' | 'running' | 'needs_input' | 'done' | 'error'

export interface ChatState {
  id: string
  title: string
  status: ChatStatus
  /** short live description of what the agent is doing, shown in the chat list */
  activity: string
  messages: ChatMessage[]
  contextTokens: number
  createdAt: number
  startedAt: number | null
  finishedAt: number | null
}

interface ChatsState {
  order: string[]
  chats: Record<string, ChatState>
  activeId: string
}

const TOOL_ACTIVITY: Record<string, string> = {
  memory: 'Updating memory',
  load_skill: 'Loading skill',
  bash: 'Running command',
  run_node: 'Running Node script',
  write_file: 'Writing file',
  read_file: 'Reading file'
}

function makeChat(): ChatState {
  return {
    id: crypto.randomUUID(),
    title: 'New chat',
    status: 'idle',
    activity: '',
    messages: [],
    contextTokens: 0,
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null
  }
}

const first = makeChat()

export const chatsStore = new Store<ChatsState>({
  order: [first.id],
  chats: { [first.id]: first },
  activeId: first.id
})

function updateChat(id: string, updater: (chat: ChatState) => ChatState): void {
  chatsStore.setState((state) => {
    const chat = state.chats[id]
    if (!chat) return state
    return { ...state, chats: { ...state.chats, [id]: updater(chat) } }
  })
}

export function createChat(): string {
  const chat = makeChat()
  chatsStore.setState((state) => ({
    order: [chat.id, ...state.order],
    chats: { ...state.chats, [chat.id]: chat },
    activeId: chat.id
  }))
  return chat.id
}

export function setActiveChat(id: string): void {
  chatsStore.setState((state) => (state.chats[id] ? { ...state, activeId: id } : state))
}

export function removeChat(id: string): void {
  void window.api.chat.reset(id)
  chatsStore.setState((state) => {
    const order = state.order.filter((x) => x !== id)
    const chats = { ...state.chats }
    delete chats[id]
    if (order.length === 0) {
      const chat = makeChat()
      return { order: [chat.id], chats: { [chat.id]: chat }, activeId: chat.id }
    }
    return { order, chats, activeId: state.activeId === id ? order[0] : state.activeId }
  })
}

/** Record a just-sent user message and flip the chat to running. */
export function beginUserTurn(id: string, text: string, images: string[]): void {
  updateChat(id, (chat) => ({
    ...chat,
    title: chat.messages.length === 0 ? text.slice(0, 60) : chat.title,
    status: 'running',
    activity: 'Thinking…',
    startedAt: Date.now(),
    finishedAt: null,
    messages: [...chat.messages, { role: 'user', text, images }, { role: 'assistant', blocks: [] }]
  }))
}

/** Mark an in-message question card as answered and resume the running state. */
export function recordAnswers(id: string, toolUseId: string, answers: string[][]): void {
  updateChat(id, (chat) => ({
    ...chat,
    status: 'running',
    activity: 'Thinking…',
    messages: chat.messages.map((msg) => {
      if (msg.role !== 'assistant') return msg
      return {
        ...msg,
        blocks: msg.blocks.map((b) =>
          b.kind === 'question' && b.toolUseId === toolUseId ? { ...b, answers } : b
        )
      }
    })
  }))
}

export function markStopped(id: string): void {
  updateChat(id, (chat) =>
    chat.status === 'running' || chat.status === 'needs_input'
      ? { ...chat, activity: 'Stopping…' }
      : chat
  )
}

function applyBlocks(
  chat: ChatState,
  apply: (blocks: AssistantBlock[]) => AssistantBlock[]
): ChatState {
  const messages = [...chat.messages]
  const last = messages[messages.length - 1]
  if (!last || last.role !== 'assistant') return chat
  messages[messages.length - 1] = { role: 'assistant', blocks: apply([...last.blocks]) }
  return { ...chat, messages }
}

function applyEvent(id: string, ev: ChatEvent): void {
  updateChat(id, (chat) => {
    switch (ev.type) {
      case 'start':
        return { ...chat, status: 'running', activity: 'Thinking…' }
      case 'thinking':
        return { ...chat, activity: 'Thinking…' }
      case 'context':
        return { ...chat, contextTokens: ev.tokens }
      case 'text':
        return applyBlocks({ ...chat, activity: 'Responding…' }, (blocks) => {
          const tail = blocks[blocks.length - 1]
          if (tail && tail.kind === 'text') {
            blocks[blocks.length - 1] = { kind: 'text', text: tail.text + ev.delta }
          } else {
            blocks.push({ kind: 'text', text: ev.delta })
          }
          return blocks
        })
      case 'tool_start':
        return applyBlocks(
          { ...chat, activity: TOOL_ACTIVITY[ev.name] ?? ev.name },
          (blocks) => {
            blocks.push({ kind: 'tool', id: ev.id, name: ev.name, input: ev.input, done: false })
            return blocks
          }
        )
      case 'tool_result':
        return applyBlocks(chat, (blocks) => {
          const idx = blocks.findIndex((b) => b.kind === 'tool' && b.id === ev.id)
          if (idx >= 0) {
            blocks[idx] = {
              ...(blocks[idx] as Extract<AssistantBlock, { kind: 'tool' }>),
              done: true,
              ok: ev.ok,
              summary: ev.summary
            }
          }
          return blocks
        })
      case 'questions':
        return applyBlocks(
          { ...chat, status: 'needs_input', activity: 'Waiting for your answer' },
          (blocks) => {
            blocks.push({
              kind: 'question',
              toolUseId: ev.toolUseId,
              questions: ev.questions,
              answers: null
            })
            return blocks
          }
        )
      case 'compaction':
        return applyBlocks({ ...chat, activity: 'Compacting context…' }, (blocks) => {
          if (ev.phase === 'start') {
            blocks.push({ kind: 'compaction', done: false })
          } else {
            const idx = blocks.findLastIndex((b) => b.kind === 'compaction' && !b.done)
            const done = {
              kind: 'compaction' as const,
              done: true,
              tokensBefore: ev.tokensBefore,
              tokensAfter: ev.tokensAfter
            }
            if (idx >= 0) blocks[idx] = done
            else blocks.push(done)
          }
          return blocks
        })
      case 'error':
        return applyBlocks(
          { ...chat, status: 'error', activity: 'Failed', finishedAt: Date.now() },
          (blocks) => {
            blocks.push({ kind: 'error', message: ev.message })
            return blocks
          }
        )
      case 'done':
        return {
          ...chat,
          status: chat.status === 'error' ? 'error' : 'done',
          activity: chat.status === 'error' ? 'Failed' : 'Completed',
          finishedAt: chat.finishedAt ?? Date.now()
        }
      default:
        return chat
    }
  })
}

let onTurnSettled: (() => void) | null = null
let wired = false

/**
 * Subscribe (once, for the app's lifetime) to chat events from the main
 * process. Events are routed into the store by chat id, so chats keep
 * streaming while another chat — or another screen — is displayed.
 */
export function initChatEvents(turnSettled: () => void): void {
  onTurnSettled = turnSettled
  if (wired) return
  wired = true
  window.api.chat.onEvent((chatId, ev) => {
    applyEvent(chatId, ev)
    if (ev.type === 'done' || ev.type === 'error') onTurnSettled?.()
  })
}
