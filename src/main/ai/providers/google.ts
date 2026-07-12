import { createGoogle } from '@ai-sdk/google'
import type { SecretBag } from '../../secure-store'
import { CATALOG } from './catalog'
import { stringSetting, type ProviderModule, type ProviderSettings } from './types'

export const googleProvider: ProviderModule = {
  id: 'google',
  label: 'Google (Gemini API)',
  models: CATALOG.google,
  fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', secret: true, required: true },
    {
      key: 'baseURL',
      label: 'Base URL',
      type: 'text',
      placeholder: 'https://generativelanguage.googleapis.com/v1beta'
    }
  ],
  isConfigured(_settings, secrets) {
    return Boolean(secrets.apiKey)
  },
  createModel(settings: ProviderSettings, secrets: SecretBag, modelId: string) {
    const provider = createGoogle({
      apiKey: secrets.apiKey,
      baseURL: stringSetting(settings, 'baseURL')
    })
    return provider(modelId)
  }
}
