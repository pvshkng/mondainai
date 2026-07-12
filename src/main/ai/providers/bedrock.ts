import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock'
import type { SecretBag } from '../../secure-store'
import { CATALOG } from './catalog'
import { stringSetting, type ProviderModule, type ProviderSettings } from './types'

export const bedrockProvider: ProviderModule = {
  id: 'bedrock',
  label: 'Amazon Bedrock',
  models: CATALOG.bedrock,
  fields: [
    { key: 'region', label: 'AWS Region', type: 'text', required: true, placeholder: 'us-east-1' },
    {
      key: 'apiKey',
      label: 'Bearer API Key',
      type: 'password',
      secret: true,
      helpText: 'Use this, or an access key pair below. The bearer key takes precedence.'
    },
    { key: 'accessKeyId', label: 'AWS Access Key ID', type: 'password', secret: true },
    { key: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password', secret: true },
    { key: 'sessionToken', label: 'AWS Session Token (optional)', type: 'password', secret: true },
    { key: 'baseURL', label: 'Base URL', type: 'text' }
  ],
  isConfigured(settings, secrets) {
    const hasCreds = Boolean(secrets.apiKey || (secrets.accessKeyId && secrets.secretAccessKey))
    return hasCreds && Boolean(stringSetting(settings, 'region'))
  },
  createModel(settings: ProviderSettings, secrets: SecretBag, modelId: string) {
    const provider = createAmazonBedrock({
      region: stringSetting(settings, 'region'),
      apiKey: secrets.apiKey,
      accessKeyId: secrets.accessKeyId,
      secretAccessKey: secrets.secretAccessKey,
      sessionToken: secrets.sessionToken,
      baseURL: stringSetting(settings, 'baseURL')
    })
    return provider(modelId)
  }
}
