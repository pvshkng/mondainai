export type ProviderId = 'openai' | 'anthropic' | 'google' | 'azure' | 'bedrock' | 'vertex' | 'mistral'

export type SecretBag = Record<string, string>

export type FieldType = 'text' | 'password' | 'textarea' | 'checkbox'

export type FieldSchema = {
  key: string
  label: string
  type: FieldType
  secret?: boolean
  required?: boolean
  placeholder?: string
  helpText?: string
  default?: string | boolean
}

export type ModelInfo = {
  id: string
  label: string
}

export type ProviderSettings = Record<string, unknown>

export type ProviderSummary = {
  id: ProviderId
  label: string
  enabled: boolean
  configured: boolean
  fields: FieldSchema[]
  settings: ProviderSettings
  secretPreviews: Record<string, string>
  models: ModelInfo[]
  modelsAreCustomOnly: boolean
  customModels: string[]
}

export type SaveProviderInput = {
  enabled: boolean
  settings: ProviderSettings
  secrets: SecretBag
  customModels: string[]
}

export type ConfiguredModel = {
  providerId: ProviderId
  providerLabel: string
  modelId: string
  label: string
}

export type ProviderTestResult = { ok: true; sampleModel: string } | { ok: false; error: string }
