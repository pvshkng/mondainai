import { createAnthropic } from '@ai-sdk/anthropic'
import type { SecretBag } from '../../secure-store'
import { CATALOG } from './catalog'
import { stringSetting, type ProviderModule, type ProviderSettings } from './types'

export const anthropicProvider: ProviderModule = {
  id: 'anthropic',
  label: 'Anthropic',
  models: CATALOG.anthropic,
  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      type: 'password',
      secret: true,
      helpText: 'Either an API key or an auth token is required.'
    },
    { key: 'authToken', label: 'Auth Token (OAuth)', type: 'password', secret: true },
    { key: 'baseURL', label: 'Base URL', type: 'text', placeholder: 'https://api.anthropic.com/v1' }
  ],
  isConfigured(_settings, secrets) {
    return Boolean(secrets.apiKey || secrets.authToken)
  },
  createModel(settings: ProviderSettings, secrets: SecretBag, modelId: string) {
    const provider = createAnthropic({
      apiKey: secrets.apiKey,
      authToken: secrets.authToken,
      baseURL: stringSetting(settings, 'baseURL')
    })
    return provider(modelId)
  }
}
