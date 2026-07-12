import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'

type PrepareRequest<T extends UIMessage> = (request: {
  id: string
  messages: T[]
  body: Record<string, unknown>
  trigger: 'submit-message' | 'regenerate-message'
  messageId: string | undefined
}) => { body: Record<string, unknown> }

type SendMessagesOptions<T extends UIMessage> = {
  trigger: 'submit-message' | 'regenerate-message'
  chatId: string
  messageId: string | undefined
  messages: T[]
  abortSignal: AbortSignal | undefined
  body?: object
}

export class IPCTransport<T extends UIMessage> implements ChatTransport<T> {
  private prepareSendMessagesRequest: PrepareRequest<T>

  constructor(options: { prepareSendMessagesRequest: PrepareRequest<T> }) {
    this.prepareSendMessagesRequest = options.prepareSendMessagesRequest
  }

  async sendMessages(options: SendMessagesOptions<T>): Promise<ReadableStream<UIMessageChunk>> {
    const { messages, abortSignal, chatId, trigger, messageId } = options

    const prepared = this.prepareSendMessagesRequest({
      id: chatId,
      messages,
      body: (options.body as Record<string, unknown>) ?? {},
      trigger,
      messageId
    })

    const streamId = await window.api.chat.start(prepared.body)

    let unsubscribe = (): void => {}

    return new ReadableStream<UIMessageChunk>({
      start(controller) {
        const finish = (): void => {
          try {
            controller.close()
          } catch {

          }
          unsubscribe()
        }

        unsubscribe = window.api.chat.subscribe(streamId, {
          onChunk: (chunk) => controller.enqueue(chunk as UIMessageChunk),
          onFinish: finish,
          onError: (message) => {
            controller.error(new Error(message))
            unsubscribe()
          }
        })

        if (abortSignal) {
          if (abortSignal.aborted) {
            void window.api.chat.stop(streamId)
            finish()
          } else {
            abortSignal.addEventListener('abort', () => {
              void window.api.chat.stop(streamId)
              finish()
            })
          }
        }
      },
      cancel() {
        void window.api.chat.stop(streamId)
        unsubscribe()
      }
    })
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null
  }
}
