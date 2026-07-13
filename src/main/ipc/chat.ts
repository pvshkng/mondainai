import { ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  streamText,
  createUIMessageStream,
  convertToModelMessages,
  toUIMessageStream,
  isStepCount,
  type UIMessage
} from 'ai'
import { getDefaultSelection, getModel } from '../ai/providers/registry'
import type { ProviderId } from '../ai/providers/types'
import {
  getChatById,
  saveChat,
  saveMessages,
  getMessagesByChatId,
  getHistory,
  deleteChatById,
  markChatAsRead,
  updateChatTitle
} from '../store'
import { renderSystemInstruction } from '../prompts/system'
import { generateTitleFromUserMessage } from '../ai/title'
import { getMcpTools } from '../mcp/manager'
import { getSandboxTools } from '../ai/tools'
import { ensureSandbox } from '../services/sandbox'
import { getActiveSkills } from '../skills/store'
import { logger } from '../logger'

const activeStreams = new Map<string, AbortController>()

type StartPayload = {
  id: string
  message: {
    id?: string
    role: 'user'
    parts?: unknown[]
    attachments?: unknown[]
  }
  providerId?: string
  modelId?: string
}

function send(sender: WebContents, streamId: string, event: Record<string, unknown>): void {
  if (sender.isDestroyed()) return
  sender.send('chat:stream', { streamId, ...event })
}

async function runStream(
  sender: WebContents,
  streamId: string,
  payload: StartPayload
): Promise<void> {
  const { id: chatId, message, providerId, modelId } = payload
  const controller = new AbortController()
  activeStreams.set(streamId, controller)

  try {
    const selection =
      providerId && modelId
        ? { providerId: providerId as ProviderId, modelId }
        : getDefaultSelection()
    if (!selection) {
      send(sender, streamId, {
        type: 'error',
        message: 'No AI provider is configured yet. Add one in Settings > Providers.'
      })
      return
    }

    const existingChat = getChatById(chatId)
    let titlePromise: Promise<string> | null = null

    if (!existingChat) {
      saveChat({ id: chatId, title: 'New Chat', visibility: 'private' })
      titlePromise = generateTitleFromUserMessage({
        message: { parts: message.parts as { type: string; text?: string }[] }
      })
    }

    saveMessages([
      {
        id: message.id ?? randomUUID(),
        chatId,
        role: 'user',
        parts: message.parts ?? [],
        attachments: message.attachments ?? []
      }
    ])

    const storedMessages = getMessagesByChatId(chatId)
    const allMessages = storedMessages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts,
      metadata: {}
    })) as unknown as UIMessage[]

    const sandboxRoot = await ensureSandbox()

    const uiStream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: getModel(selection.providerId, selection.modelId),
          instructions: renderSystemInstruction(new Date().toISOString(), getActiveSkills(), sandboxRoot),
          messages: await convertToModelMessages(allMessages),
          tools: { ...getSandboxTools(), ...getMcpTools() },
          stopWhen: isStepCount(40),
          abortSignal: controller.signal
        })
        writer.merge(toUIMessageStream({ stream: result.stream }))

        if (titlePromise) {
          const title = await titlePromise
          writer.write({ type: 'data-chat-title', data: title })
          updateChatTitle(chatId, title)
        }
      },
      generateId: randomUUID,
      onEnd: ({ messages }) => {
        const assistantMessages = messages.filter((m) => m.role === 'assistant')
        if (assistantMessages.length > 0) {
          saveMessages(
            assistantMessages.map((m) => ({
              id: m.id,
              chatId,
              role: 'assistant' as const,
              parts: m.parts as unknown[],
              attachments: []
            }))
          )
        }
      },
      onError: (error) => {
        const ref = randomUUID().slice(0, 8)
        logger.error('chat', `stream error ${ref}`, error)
        return `Something went wrong. Please try again. (ref: ${ref})`
      }
    })

    const reader = uiStream.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      send(sender, streamId, { type: 'chunk', chunk: value })
    }
    send(sender, streamId, { type: 'finish' })
  } catch (error) {
    logger.error('chat', 'stream setup failed', error)
    send(sender, streamId, {
      type: 'error',
      message: error instanceof Error ? error.message : String(error)
    })
  } finally {
    activeStreams.delete(streamId)
  }
}

export function registerChatIpc(): void {
  ipcMain.handle('chat:start', (event: IpcMainInvokeEvent, payload: StartPayload) => {
    const streamId = randomUUID()
    void runStream(event.sender, streamId, payload)
    return streamId
  })

  ipcMain.handle('chat:stop', (_event, streamId: string) => {
    activeStreams.get(streamId)?.abort()
    activeStreams.delete(streamId)
    return true
  })

  ipcMain.handle('chat:history', (_event, params: { limit?: number; endingBefore?: string | null }) => {
    return getHistory({ limit: params?.limit ?? 20, endingBefore: params?.endingBefore ?? null })
  })

  ipcMain.handle('chat:messages', (_event, chatId: string) => {
    const messages = getMessagesByChatId(chatId).map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts,
      metadata: {}
    }))
    return { messages, visibility: 'private', isReadonly: false }
  })

  ipcMain.handle('chat:delete', (_event, chatId: string) => {
    deleteChatById(chatId)
    return true
  })

  ipcMain.handle('chat:markRead', (_event, chatId: string) => {
    markChatAsRead(chatId)
    return true
  })
}
