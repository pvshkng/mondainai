import { createAzure } from '@ai-sdk/azure'
import type { SecretBag } from '../../secure-store'
import { boolSetting, stringSetting, type ProviderModule, type ProviderSettings } from './types'

export const azureProvider: ProviderModule = {
  id: 'azure',
  label: 'Azure OpenAI',
  modelsAreCustomOnly: true,
  models: [],
  fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', secret: true, required: true },
    {
      key: 'resourceName',
      label: 'Resource Name',
      type: 'text',
      helpText: 'Your Azure resource name, used to build the endpoint unless a Base URL is set.'
    },
    { key: 'baseURL', label: 'Base URL (overrides Resource Name)', type: 'text' },
    { key: 'apiVersion', label: 'API Version', type: 'text', placeholder: 'v1' },
    {
      key: 'useDeploymentBasedUrls',
      label: 'Use legacy deployment-based URLs',
      type: 'checkbox'
    }
  ],
  isConfigured(settings, secrets) {
    return Boolean(secrets.apiKey && (stringSetting(settings, 'resourceName') || stringSetting(settings, 'baseURL')))
  },
  createModel(settings: ProviderSettings, secrets: SecretBag, modelId: string) {
    const provider = createAzure({
      apiKey: secrets.apiKey,
      resourceName: stringSetting(settings, 'resourceName'),
      baseURL: stringSetting(settings, 'baseURL'),
      apiVersion: stringSetting(settings, 'apiVersion'),
      useDeploymentBasedUrls: boolSetting(settings, 'useDeploymentBasedUrls')
    })
    return provider(modelId)
  }
}
