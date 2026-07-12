# mondainai

A local, offline-first desktop chatbot built with Electron, React, Tailwind, and AI SDK 7. Everything is stored locally: chat history, provider credentials, MCP server configs, skills, and session logs. The LLM is called directly from the Electron main process; the renderer never talks to the network.

## Providers

Configure any of these from **You > Settings > Providers** inside the app:

OpenAI, Anthropic, Google (Gemini API), Azure OpenAI, Amazon Bedrock, Google Vertex AI, Mistral.

API keys and settings are stored locally on this device (encrypted at rest via the OS keychain through Electron safeStorage when available) and are only sent to the provider they belong to. Configured providers surface their models in the composer's model picker.

`.env` is now only an optional bootstrap: if `OPENAI_API_KEY` is present on first run and no provider is configured yet, it seeds the OpenAI provider once.

## MCP and Skills

- **Settings > MCP**: add Model Context Protocol servers (stdio command or HTTP/SSE URL). Connected servers' tools are given to the model during chat. Stdio servers run a local command you configure, so only add commands you trust.
- **Settings > Skills**: user-authored instruction snippets (name, description, instructions). Active skills are appended to the system prompt.

## Architecture

```
src/
  shared/               Dependency-free types shared across processes
  main/                 Electron main process (Node)
    index.ts            Window creation + bootstrap
    config.ts           Loads .env (optional bootstrap)
    store.ts            Local JSON chat storage (userData/chat-data.json)
    secure-store.ts     safeStorage-encrypted provider/MCP credentials (userData/providers.json)
    logger.ts           Local session log (userData/logs/app.log)
    ai/providers/       Per-provider modules + registry (7 providers)
    mcp/manager.ts      MCP client lifecycle, merged ToolSet for streamText
    skills/store.ts     Local skills storage (userData/skills.json)
    prompts/            System prompt (+ active skills)
    ipc/                chat, providers, mcp, skills IPC handlers
  preload/
    index.ts            Exposes window.api.{chat,providers,mcp,skills}
  renderer/src/         React UI
    lib/ipc-transport.ts  IPCTransport, a ChatTransport for useChat
    components/settings/  Settings modal (Providers / MCP / Skills)
```

Theme settings live in the sidebar avatar popup (not the settings modal) so the chat stays visible while adjusting the theme.

## Setup

```bash
bun install
bun run dev
```

Then open **You > Settings > Providers** and add a provider.

## Develop / build

```bash
bun run dev            # launch the app with HMR
bun run typecheck      # node + web TypeScript checks
bun run build          # production build (out/)
bun run build:linux    # package (AppImage), also build:win / build:mac
```
