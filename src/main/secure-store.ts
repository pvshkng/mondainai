import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SecretBag } from '../shared/provider-types'

export type { SecretBag }

type EncryptedRecord = {
  encrypted: boolean
  values: Record<string, string>
}

type SecureDbShape<T> = Record<string, { config: T; secrets: EncryptedRecord }>

let filePath = ''

function getFilePath(): string {
  if (!filePath) {
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    filePath = join(dir, 'providers.json')
  }
  return filePath
}

function readDb<T>(): SecureDbShape<T> {
  const path = getFilePath()
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as SecureDbShape<T>
  } catch {
    return {}
  }
}

function writeDb<T>(db: SecureDbShape<T>): void {
  writeFileSync(getFilePath(), JSON.stringify(db, null, 2))
}

export function isSecretEncryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function encryptSecrets(secrets: SecretBag): EncryptedRecord {
  const available = isSecretEncryptionAvailable()
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(secrets)) {
    if (!value) continue
    values[key] = available ? safeStorage.encryptString(value).toString('base64') : value
  }
  return { encrypted: available, values }
}

function decryptSecrets(record: EncryptedRecord | undefined): SecretBag {
  if (!record) return {}
  const out: SecretBag = {}
  for (const [key, value] of Object.entries(record.values)) {
    try {
      out[key] = record.encrypted ? safeStorage.decryptString(Buffer.from(value, 'base64')) : value
    } catch {

    }
  }
  return out
}

export function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 4) return '••••'
  return `••••${value.slice(-4)}`
}

export function getEntryConfig<T>(namespace: string, id: string): T | null {
  const db = readDb<T>()
  return db[`${namespace}:${id}`]?.config ?? null
}

export function getEntrySecrets(namespace: string, id: string): SecretBag {
  const db = readDb<unknown>()
  return decryptSecrets(db[`${namespace}:${id}`]?.secrets)
}

export function listEntryIds(namespace: string): string[] {
  const db = readDb<unknown>()
  const prefix = `${namespace}:`
  return Object.keys(db)
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length))
}

/**
 * Saves config + secrets for one entry. `secrets` values that are omitted or
 * empty keep whatever was previously stored for that key (so blank password
 * fields in a form never wipe out an already-saved credential).
 */
export function saveEntry<T>(
  namespace: string,
  id: string,
  config: T,
  secrets: SecretBag
): void {
  const db = readDb<T>()
  const key = `${namespace}:${id}`
  const existingSecrets = decryptSecrets(db[key]?.secrets)
  const mergedSecrets: SecretBag = { ...existingSecrets }
  for (const [k, v] of Object.entries(secrets)) {
    if (v) mergedSecrets[k] = v
  }
  db[key] = { config, secrets: encryptSecrets(mergedSecrets) }
  writeDb(db)
}

export function deleteEntry(namespace: string, id: string): void {
  const db = readDb<unknown>()
  delete db[`${namespace}:${id}`]
  writeDb(db)
}
