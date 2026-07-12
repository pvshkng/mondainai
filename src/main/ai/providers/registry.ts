import type { LanguageModel } from 'ai'
import { generateText } from 'ai'
import {
  deleteEntry,
  getEntryConfig,
  getEntrySecrets,
  maskSecret,
  saveEntry,
  type SecretBag
} from '../../secure-store'
import type {
  ConfiguredModel,
  ProviderId,
  ProviderSettings,
  ProviderSummary,
  ProviderTestResult,
  SaveProviderInput
} from '../../../shared/provider-types'
import { anthropicProvider } from './anthropic'
import { azureProvider } from './azure'
import { bedrockProvider } from './bedrock'
import { googleProvider } from './google'
import { mistralProvider } from './mistral'
import { openaiProvider } from './openai'
import type { ProviderModule } from './types'
import { vertexProvider } from './vertex'

export type { ConfiguredModel, ProviderSummary, SaveProviderInput }

const NAMESPACE = 'provider'

const PROVIDERS: Record<ProviderId, ProviderModule> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider,
  azure: azureProvider,
  bedrock: bedrockProvider,
  vertex: vertexProvider,
  mistral: mistralProvider
}

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[]

type StoredConfig = {
  enabled: boolean
  settings: ProviderSettings
  customModels: string[]
}

function defaultConfig(): StoredConfig {
  return { enabled: true, settings: {}, customModels: [] }
}

function loadConfig(providerId: ProviderId): StoredConfig {
  return getEntryConfig<StoredConfig>(NAMESPACE, providerId) ?? defaultConfig()
}

let seeded = false

/** One-time seed from legacy `.env` OPENAI_* vars, so existing setups keep working. */
export function seedFromEnvIfNeeded(): void {
  if (seeded) return
  seeded = true
  const existing = getEntryConfig<StoredConfig>(NAMESPACE, 'openai')
  if (existing) return
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return
  saveEntry<StoredConfig>(
    NAMESPACE,
    'openai',
    {
      enabled: true,
      settings: { baseURL: process.env.OPENAI_BASE_URL || undefined },
      customModels: process.env.OPENAI_MODEL ? [process.env.OPENAI_MODEL] : []
    },
    { apiKey }
  )
}

export function listProviders(): ProviderSummary[] {
  return PROVIDER_IDS.map((id) => {
    const mod = PROVIDERS[id]
    const config = loadConfig(id)
    const secrets = getEntrySecrets(NAMESPACE, id)
    const secretPreviews: Record<string, string> = {}
    for (const field of mod.fields) {
      if (field.secret && secrets[field.key]) secretPreviews[field.key] = maskSecret(secrets[field.key])
    }
    return {
      id,
      label: mod.label,
      enabled: config.enabled,
      configured: mod.isConfigured(config.settings, secrets),
      fields: mod.fields,
      settings: config.settings,
      secretPreviews,
      models: mod.models,
      modelsAreCustomOnly: Boolean(mod.modelsAreCustomOnly),
      customModels: config.customModels
    }
  })
}

export function saveProvider(providerId: ProviderId, input: SaveProviderInput): void {
  saveEntry<StoredConfig>(
    NAMESPACE,
    providerId,
    { enabled: input.enabled, settings: input.settings, customModels: input.customModels },
    input.secrets
  )
}

export function deleteProvider(providerId: ProviderId): void {
  deleteEntry(NAMESPACE, providerId)
}

export function listConfiguredModels(): ConfiguredModel[] {
  const out: ConfiguredModel[] = []
  for (const id of PROVIDER_IDS) {
    const mod = PROVIDERS[id]
    const config = loadConfig(id)
    if (!config.enabled) continue
    const secrets = getEntrySecrets(NAMESPACE, id)
    if (!mod.isConfigured(config.settings, secrets)) continue
    for (const model of mod.models) {
      out.push({ providerId: id, providerLabel: mod.label, modelId: model.id, label: model.label })
    }
    for (const modelId of config.customModels) {
      out.push({ providerId: id, providerLabel: mod.label, modelId, label: modelId })
    }
  }
  return out
}

const modelCache = new Map<string, LanguageModel>()

export function getModel(providerId: ProviderId, modelId: string): LanguageModel {
  const mod = PROVIDERS[providerId]
  if (!mod) throw new Error(`Unknown provider: ${providerId}`)
  const config = loadConfig(providerId)
  const secrets = getEntrySecrets(NAMESPACE, providerId)
  const cacheKey = `${providerId}:${modelId}:${JSON.stringify(config.settings)}:${JSON.stringify(secrets)}`
  const cached = modelCache.get(cacheKey)
  if (cached) return cached
  const model = mod.createModel(config.settings, secrets, modelId)
  modelCache.set(cacheKey, model)
  return model
}

export function invalidateModelCache(): void {
  modelCache.clear()
}

export function getDefaultSelection(): { providerId: ProviderId; modelId: string } | null {
  const models = listConfiguredModels()
  return models.length > 0 ? { providerId: models[0].providerId, modelId: models[0].modelId } : null
}

export async function testProvider(
  providerId: ProviderId,
  input: SaveProviderInput
): Promise<ProviderTestResult> {
  const mod = PROVIDERS[providerId]
  const secrets: SecretBag = { ...getEntrySecrets(NAMESPACE, providerId), ...input.secrets }
  const settings = input.settings
  if (!mod.isConfigured(settings, secrets)) {
    return { ok: false, error: 'Missing required fields.' }
  }
  const sampleModelId = mod.models[0]?.id ?? input.customModels[0]
  if (!sampleModelId) {
    return { ok: false, error: 'Add at least one model (or a custom model ID) to test.' }
  }
  try {
    const model = mod.createModel(settings, secrets, sampleModelId)
    await generateText({ model, prompt: 'Say "ok".', maxOutputTokens: 5 })
    return { ok: true, sampleModel: sampleModelId }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
