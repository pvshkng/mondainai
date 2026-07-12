export type McpTransportType = 'stdio' | 'http' | 'sse'

export type McpServerSummary = {
  id: string
  name: string
  enabled: boolean
  transportType: McpTransportType
  command: string
  args: string
  url: string
  hasEnv: boolean
  hasHeaders: boolean
  connected: boolean
  toolNames: string[]
  lastError: string | null
}

export type SaveMcpServerInput = {
  name: string
  enabled: boolean
  transportType: McpTransportType
  command: string
  args: string
  url: string
  env: string
  headers: string
}

export type McpTestResult = { ok: true; tools: string[] } | { ok: false; error: string }
