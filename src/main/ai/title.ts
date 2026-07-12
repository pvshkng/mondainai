import { generateText } from 'ai'
import { getDefaultSelection, getModel } from './providers/registry'

export async function generateTitleFromUserMessage({
  message
}: {
  message: { parts?: { type: string; text?: string }[] }
}): Promise<string> {
  try {
    const text = message.parts
      ?.filter((p) => p.type === 'text')
      .map((p) => p.text ?? '')
      .join(' ')
      .trim()
      .slice(0, 200)

    if (!text) return 'New Chat'

    const selection = getDefaultSelection()
    if (!selection) return 'New Chat'

    const { text: title } = await generateText({
      model: getModel(selection.providerId, selection.modelId),
      prompt: `Generate a short chat title (2-5 words) summarizing: "${text}"\n\nOutput ONLY the title text, no quotes, no prefixes.`,
      maxOutputTokens: 20
    })

    return title.trim().replace(/^["']|["']$/g, '') || 'New Chat'
  } catch {
    return 'New Chat'
  }
}
