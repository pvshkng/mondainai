import { randomUUID } from 'node:crypto'
import type { ToolSet } from 'ai'
import { createMCPClient, type MCPClient } from '@ai-sdk/mcp'
import { Experimental_StdioMCPTransport as StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio'
import {
  deleteEntry,
  getEntryConfig,
  getEntrySecrets,
  listEntryIds,
  saveEntry
} from '../secure-store'
import type {
  McpServerSummary,
  McpTestResult,
  McpTransportType,
  SaveMcpServerInput
} from '../../shared/mcp-types'
import { logger } from '../logger'

const NAMESPACE = 'mcp'

type StoredMcpConfig = {
  name: string
  enabled: boolean
  transportType: McpTransportType
  command: string
  args: string
  url: string
}

type ConnectionState = {
  client: MCPClient
  tools: ToolSet
}

const connections = new Map<string, ConnectionState>()
const connectionErrors = new Map<string, string>()

function parseKeyValueLines(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

function parseArgs(raw: string): string[] {
  return raw
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

async function connect(
  config: StoredMcpConfig,
  secrets: Record<string, string>
): Promise<ConnectionState> {
  const client =
    config.transportType === 'stdio'
      ? await createMCPClient({
          transport: new StdioMCPTransport({
            command: config.command,
            args: parseArgs(config.args),
            env: { ...(process.env as Record<string, string>), ...parseKeyValueLines(secrets.env ?? '') }
          })
        })
      : await createMCPClient({
          transport: {
            type: config.transportType,
            url: config.url,
            headers: parseKeyValueLines(secrets.headers ?? '')
          }
        })
  const tools = await client.tools()
  return { client, tools }
}

export async function syncMcpConnections(): Promise<void> {
  const ids = listEntryIds(NAMESPACE)
  for (const [id, state] of connections) {
    const config = getEntryConfig<StoredMcpConfig>(NAMESPACE, id)
    if (!ids.includes(id) || !config?.enabled) {
      await state.client.close().catch(() => {})
      connections.delete(id)
    }
  }
  for (const id of ids) {
    if (connections.has(id)) continue
    const config = getEntryConfig<StoredMcpConfig>(NAMESPACE, id)
    if (!config?.enabled) continue
    try {
      const state = await connect(config, getEntrySecrets(NAMESPACE, id))
      connections.set(id, state)
      connectionErrors.delete(id)
    } catch (error) {
      connectionErrors.set(id, error instanceof Error ? error.message : String(error))
      logger.error('mcp', `failed to connect server ${config.name}`, error)
    }
  }
}

export function getMcpTools(): ToolSet {
  const merged: ToolSet = {}
  for (const state of connections.values()) {
    Object.assign(merged, state.tools)
  }
  return merged
}

export function listMcpServers(): McpServerSummary[] {
  return listEntryIds(NAMESPACE).map((id) => {
    const config = getEntryConfig<StoredMcpConfig>(NAMESPACE, id)
    const secrets = getEntrySecrets(NAMESPACE, id)
    const state = connections.get(id)
    return {
      id,
      name: config?.name ?? id,
      enabled: config?.enabled ?? false,
      transportType: config?.transportType ?? 'http',
      command: config?.command ?? '',
      args: config?.args ?? '',
      url: config?.url ?? '',
      hasEnv: Boolean(secrets.env),
      hasHeaders: Boolean(secrets.headers),
      connected: Boolean(state),
      toolNames: state ? Object.keys(state.tools) : [],
      lastError: connectionErrors.get(id) ?? null
    }
  })
}

export async function saveMcpServer(
  id: string | null,
  input: SaveMcpServerInput
): Promise<McpServerSummary[]> {
  const serverId = id ?? randomUUID()
  saveEntry<StoredMcpConfig>(
    NAMESPACE,
    serverId,
    {
      name: input.name,
      enabled: input.enabled,
      transportType: input.transportType,
      command: input.command,
      args: input.args,
      url: input.url
    },
    { env: input.env, headers: input.headers }
  )
  const existing = connections.get(serverId)
  if (existing) {
    await existing.client.close().catch(() => {})
    connections.delete(serverId)
  }
  await syncMcpConnections()
  return listMcpServers()
}

export async function deleteMcpServer(id: string): Promise<McpServerSummary[]> {
  deleteEntry(NAMESPACE, id)
  connectionErrors.delete(id)
  const existing = connections.get(id)
  if (existing) {
    await existing.client.close().catch(() => {})
    connections.delete(id)
  }
  return listMcpServers()
}

export async function testMcpServer(
  id: string | null,
  input: SaveMcpServerInput
): Promise<McpTestResult> {
  const storedSecrets = id ? getEntrySecrets(NAMESPACE, id) : {}
  const secrets = {
    env: input.env || storedSecrets.env || '',
    headers: input.headers || storedSecrets.headers || ''
  }
  try {
    const state = await connect(
      {
        name: input.name,
        enabled: true,
        transportType: input.transportType,
        command: input.command,
        args: input.args,
        url: input.url
      },
      secrets
    )
    const tools = Object.keys(state.tools)
    await state.client.close().catch(() => {})
    return { ok: true, tools }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function closeAllMcpConnections(): Promise<void> {
  for (const state of connections.values()) {
    await state.client.close().catch(() => {})
  }
  connections.clear()
}
