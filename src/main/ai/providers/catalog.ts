import type { ModelInfo } from './types'

export const CATALOG: Record<string, ModelInfo[]> = {
  openai: [
    { id: 'gpt-5.1', label: 'GPT-5.1' },
    { id: 'gpt-5.1-mini', label: 'GPT-5.1 Mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'o4-mini', label: 'o4-mini' }
  ],
  anthropic: [
    { id: 'claude-opus-4-5', label: 'Claude Opus 4.5' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }
  ],
  google: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }
  ],
  mistral: [
    { id: 'mistral-large-latest', label: 'Mistral Large' },
    { id: 'mistral-small-latest', label: 'Mistral Small' },
    { id: 'pixtral-large-latest', label: 'Pixtral Large' }
  ],
  bedrock: [
    { id: 'anthropic.claude-sonnet-4-5-20260929-v1:0', label: 'Claude Sonnet 4.5 (Bedrock)' },
    { id: 'amazon.nova-pro-v1:0', label: 'Amazon Nova Pro' },
    { id: 'amazon.nova-lite-v1:0', label: 'Amazon Nova Lite' }
  ],
  vertex: [
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Vertex)' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Vertex)' },
    { id: 'publishers/anthropic/models/claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (Vertex)' }
  ],
  azure: []
}
