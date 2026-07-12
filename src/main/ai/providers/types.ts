import type { LanguageModel } from 'ai'
import type {
  FieldSchema,
  FieldType,
  ModelInfo,
  ProviderId,
  ProviderSettings,
  SecretBag
} from '../../../shared/provider-types'

export type { FieldSchema, FieldType, ModelInfo, ProviderId, ProviderSettings }

export type ProviderModule = {
  id: ProviderId
  label: string
  modelsAreCustomOnly?: boolean
  fields: FieldSchema[]
  models: ModelInfo[]
  isConfigured(settings: ProviderSettings, secrets: SecretBag): boolean
  createModel(settings: ProviderSettings, secrets: SecretBag, modelId: string): LanguageModel
}

export function stringSetting(settings: ProviderSettings, key: string): string | undefined {
  const value = settings[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function boolSetting(settings: ProviderSettings, key: string): boolean {
  return settings[key] === true
}
