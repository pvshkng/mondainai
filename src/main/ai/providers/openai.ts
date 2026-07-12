import { createOpenAI } from '@ai-sdk/openai'
import type { SecretBag } from '../../secure-store'
import { CATALOG } from './catalog'
import { stringSetting, type ProviderModule, type ProviderSettings } from './types'

export const openaiProvider: ProviderModule = {
  id: 'openai',
  label: 'OpenAI',
  models: CATALOG.openai,
  fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', secret: true, required: true },
    { key: 'baseURL', label: 'Base URL', type: 'text', placeholder: 'https://api.openai.com/v1' },
    { key: 'organization', label: 'Organization ID', type: 'text' },
    { key: 'project', label: 'Project ID', type: 'text' }
  ],
  isConfigured(_settings, secrets) {
    return Boolean(secrets.apiKey)
  },
  createModel(settings: ProviderSettings, secrets: SecretBag, modelId: string) {
    const provider = createOpenAI({
      apiKey: secrets.apiKey,
      baseURL: stringSetting(settings, 'baseURL'),
      organization: stringSetting(settings, 'organization'),
      project: stringSetting(settings, 'project')
    })
    return provider(modelId)
  }
}
