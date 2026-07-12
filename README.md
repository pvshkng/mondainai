# mondainai

A local, offline-first desktop chatbot built with Electron, React, Tailwind, and the AI SDK. Migrated from a Next.js web app to a fully local Electron application — no auth, no database server, no Redis. Chat history is stored locally and the LLM is called directly from the Electron main process.

## Architecture

```
src/
  main/                 Electron main process (Node)
    index.ts            Window creation + bootstrap
    config.ts           Loads .env (OPENAI_* vars)
    store.ts            Local JSON chat storage (userData/chat-data.json)
    ai/
      provider.ts       OpenAI/Azure-compatible provider from env
      title.ts          Chat title generation
    prompts/            System prompt
    ipc/chat.ts         Streams the model over IPC, persists messages
  preload/
    index.ts            Exposes window.api.chat (typed IPC bridge)
  renderer/src/         React UI (ported from the Next.js app)
    lib/ipc-transport.ts  IPCTransport — a ChatTransport for useChat
    lib/navigation.tsx    Minimal in-app router (replaces next/navigation)
    lib/ipc-data.ts       IPC-backed SWR fetchers (history / messages)
```

The renderer never talks to the network. `useChat` uses a custom **`IPCTransport`**
(instead of the AI SDK's `DefaultChatTransport`) which:

1. calls `window.api.chat.start(payload)` → the main process starts a `streamText`
   run and returns a `streamId`,
2. subscribes to `chat:stream` IPC events and reconstructs a
   `ReadableStream<UIMessageChunk>` for `useChat` to consume,
3. calls `window.api.chat.stop(streamId)` when the request is aborted.

## Setup

```bash
bun install
cp .env.example .env   # then fill in your key
```

`.env`:

```
OPENAI_API_KEY=sk-...        # your key
OPENAI_BASE_URL=             # optional: Azure/OpenAI-compatible gateway
OPENAI_MODEL=gpt-4o-mini     # default model
```

## Develop / build

```bash
bun run dev            # launch the app with HMR
bun run build          # type-agnostic production build (out/)
bun run build:linux    # package (AppImage) — also build:win / build:mac
```
