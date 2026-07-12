import { createMistral } from '@ai-sdk/mistral'
import type { SecretBag } from '../../secure-store'
import { CATALOG } from './catalog'
import { stringSetting, type ProviderModule, type ProviderSettings } from './types'

export const mistralProvider: ProviderModule = {
  id: 'mistral',
  label: 'Mistral',
  models: CATALOG.mistral,
  fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', secret: true, required: true },
    { key: 'baseURL', label: 'Base URL', type: 'text', placeholder: 'https://api.mistral.ai/v1' }
  ],
  isConfigured(_settings, secrets) {
    return Boolean(secrets.apiKey)
  },
  createModel(settings: ProviderSettings, secrets: SecretBag, modelId: string) {
    const provider = createMistral({
      apiKey: secrets.apiKey,
      baseURL: stringSetting(settings, 'baseURL')
    })
    return provider(modelId)
  }
}
