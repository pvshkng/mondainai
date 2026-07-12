import { createVertex } from '@ai-sdk/google-vertex'
import type { SecretBag } from '../../secure-store'
import { CATALOG } from './catalog'
import { stringSetting, type ProviderModule, type ProviderSettings } from './types'

export const vertexProvider: ProviderModule = {
  id: 'vertex',
  label: 'Google Vertex AI',
  models: CATALOG.vertex,
  fields: [
    { key: 'project', label: 'Google Cloud Project', type: 'text' },
    { key: 'location', label: 'Location', type: 'text', placeholder: 'us-central1' },
    {
      key: 'apiKey',
      label: 'API Key (Express mode)',
      type: 'password',
      secret: true,
      helpText: 'Simplest option: an API key skips project/location and service-account setup entirely.'
    },
    {
      key: 'credentialsJson',
      label: 'Service Account JSON',
      type: 'textarea',
      secret: true,
      helpText: 'Paste the full service-account key JSON. Required unless using an API key.'
    }
  ],
  isConfigured(settings, secrets) {
    if (secrets.apiKey) return true
    return Boolean(secrets.credentialsJson && stringSetting(settings, 'project'))
  },
  createModel(settings: ProviderSettings, secrets: SecretBag, modelId: string) {
    if (secrets.apiKey) {
      const provider = createVertex({ apiKey: secrets.apiKey })
      return provider(modelId)
    }
    let credentials: { client_email: string; private_key: string } | undefined
    if (secrets.credentialsJson) {
      try {
        credentials = JSON.parse(secrets.credentialsJson)
      } catch {
        throw new Error('Vertex service account JSON is not valid JSON.')
      }
    }
    const provider = createVertex({
      project: stringSetting(settings, 'project'),
      location: stringSetting(settings, 'location'),
      googleAuthOptions: credentials ? { credentials } : undefined
    })
    return provider(modelId)
  }
}
