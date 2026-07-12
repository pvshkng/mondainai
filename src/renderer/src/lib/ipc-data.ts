import type { ChatHistory } from '@/types/storage'
import type { ChatMessage, VisibilityType } from '@/lib/types'

export async function historyFetcher(url: string): Promise<ChatHistory> {
  const params = new URL(url, 'http://local').searchParams
  const limit = Number(params.get('limit') ?? 20)
  const endingBefore = params.get('ending_before')
  return window.api.chat.history({ limit, endingBefore }) as Promise<ChatHistory>
}

export async function messagesFetcher(chatId: string): Promise<{
  messages: ChatMessage[]
  visibility: VisibilityType
  isReadonly: boolean
}> {
  return window.api.chat.messages(chatId) as Promise<{
    messages: ChatMessage[]
    visibility: VisibilityType
    isReadonly: boolean
  }>
}
