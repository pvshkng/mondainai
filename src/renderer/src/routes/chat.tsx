import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ChatAttachment, ChatEvent, SkillMeta } from '../../../shared/types'
import { Markdown } from '../components/Markdown'

type AssistantBlock =
  | { kind: 'text'; text: string }
  | { kind: 'tool'; id: string; name: string; input: unknown; done: boolean; ok?: boolean; summary?: string }
  | { kind: 'error'; message: string }

type ChatMessage =
  | { role: 'user'; text: string; images: string[] }
  | { role: 'assistant'; blocks: AssistantBlock[] }

const TOOL_LABELS: Record<string, string> = {
  memory: 'Memory',
  load_skill: 'Loading skill',
  bash: 'Running command',
  run_node: 'Running Node script',
  write_file: 'Writing file',
  read_file: 'Reading file'
}

function toolDetail(name: string, input: unknown): string {
  const args = (input ?? {}) as Record<string, unknown>
  switch (name) {
    case 'bash':
      return String(args.command ?? '')
    case 'memory':
      return [args.command, args.path ?? args.query].filter(Boolean).join(' ')
    case 'load_skill':
      return String(args.name ?? '')
    case 'write_file':
    case 'read_file':
      return String(args.path ?? '')
    case 'run_node':
      return `${String(args.code ?? '').slice(0, 120)}…`
    default:
      return ''
  }
}

function ToolChip({ block }: { block: Extract<AssistantBlock, { kind: 'tool' }> }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <div className="my-1.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-full items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-left text-xs text-ink-300 hover:border-ink-600"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            !block.done ? 'animate-pulse bg-warn' : block.ok ? 'bg-ok' : 'bg-danger'
          }`}
        />
        <span className="font-medium text-cream">{TOOL_LABELS[block.name] ?? block.name}</span>
        <span className="truncate font-mono text-[11px] text-ink-400">
          {toolDetail(block.name, block.input)}
        </span>
      </button>
      {open && block.summary && (
        <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-ink-800 bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-ink-400">
          {block.summary}
        </pre>
      )}
    </div>
  )
}

function SkillPicker({
  skills,
  active,
  onToggle
}: {
  skills: SkillMeta[]
  active: Set<string>
  onToggle: (name: string) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const enabled = skills.filter((s) => s.enabled)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Choose which skills are available for this message"
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
          active.size > 0
            ? 'border-accent/40 bg-accent/10 text-accent'
            : 'border-ink-700 text-ink-400 hover:text-cream'
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8L12 2z" />
        </svg>
        Skills{active.size > 0 ? ` · ${active.size}` : ''}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-ink-700 bg-ink-850 p-2 shadow-2xl">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
            Available for this message
          </div>
          {enabled.length === 0 && (
            <div className="px-2 py-3 text-xs text-ink-400">
              No skills installed or enabled. Add some on the Skills screen.
            </div>
          )}
          <div className="max-h-56 overflow-y-auto">
            {enabled.map((skill) => (
              <label
                key={skill.name}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-ink-800"
              >
                <input
                  type="checkbox"
                  checked={active.has(skill.name)}
                  onChange={() => onToggle(skill.name)}
                  className="mt-0.5 accent-[#d97757]"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-cream">{skill.name}</span>
                  <span className="block truncate text-[11px] text-ink-400">{skill.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ChatRoute(): React.JSX.Element {
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [activeSkills, setActiveSkills] = useState<Set<string> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: () => window.api.skills.list()
  })
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })

  // default the per-message skill selection to every enabled skill
  const resolvedActive = useMemo(() => {
    if (activeSkills) return activeSkills
    return new Set(skills.filter((s) => s.enabled).map((s) => s.name))
  }, [activeSkills, skills])

  useEffect(() => {
    return window.api.chat.onEvent((ev: ChatEvent) => {
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (!last || last.role !== 'assistant') return next
        const blocks = [...last.blocks]
        switch (ev.type) {
          case 'text': {
            const tail = blocks[blocks.length - 1]
            if (tail && tail.kind === 'text') {
              blocks[blocks.length - 1] = { kind: 'text', text: tail.text + ev.delta }
            } else {
              blocks.push({ kind: 'text', text: ev.delta })
            }
            break
          }
          case 'tool_start':
            blocks.push({ kind: 'tool', id: ev.id, name: ev.name, input: ev.input, done: false })
            break
          case 'tool_result': {
            const idx = blocks.findIndex((b) => b.kind === 'tool' && b.id === ev.id)
            if (idx >= 0) {
              blocks[idx] = {
                ...(blocks[idx] as Extract<AssistantBlock, { kind: 'tool' }>),
                done: true,
                ok: ev.ok,
                summary: ev.summary
              }
            }
            break
          }
          case 'error':
            blocks.push({ kind: 'error', message: ev.message })
            break
          default:
            break
        }
        next[next.length - 1] = { role: 'assistant', blocks }
        return next
      })
      if (ev.type === 'done' || ev.type === 'error') {
        setStreaming(false)
        // memory / sandbox may have changed during the turn
        queryClient.invalidateQueries({ queryKey: ['sandbox'] })
        queryClient.invalidateQueries({ queryKey: ['memory'] })
      }
    })
  }, [queryClient])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text,
        images: attachments
          .filter((a) => a.mediaType.startsWith('image/'))
          .map((a) => `data:${a.mediaType};base64,${a.dataBase64}`)
      },
      { role: 'assistant', blocks: [] }
    ])
    setStreaming(true)
    setInput('')
    const toSend = attachments
    setAttachments([])
    await window.api.chat.send({
      text,
      attachments: toSend,
      activeSkills: [...resolvedActive]
    })
  }, [input, streaming, attachments, resolvedActive])

  const onPickFiles = useCallback(async (files: FileList | null) => {
    if (!files) return
    const list: ChatAttachment[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') continue
      const buffer = await file.arrayBuffer()
      let binary = ''
      const bytes = new Uint8Array(buffer)
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      }
      list.push({ name: file.name, mediaType: file.type, dataBase64: btoa(binary) })
    }
    setAttachments((prev) => [...prev, ...list])
  }, [])

  const newChat = useCallback(async () => {
    await window.api.chat.reset()
    setMessages([])
    setStreaming(false)
  }, [])

  const noKey = settings && !settings.apiKey

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-ink-800 px-6 py-3.5">
        <div>
          <h1 className="text-sm font-semibold">Chat</h1>
          <p className="text-[11px] text-ink-400">
            {settings?.model ?? ''} · {resolvedActive.size} skill{resolvedActive.size === 1 ? '' : 's'} active
          </p>
        </div>
        <button
          onClick={newChat}
          className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 transition-colors hover:border-ink-600 hover:text-cream"
        >
          + New chat
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {noKey && (
            <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
              No Anthropic API key configured yet — add one in Settings to start chatting.
            </div>
          )}
          {messages.length === 0 && !noKey && (
            <div className="mt-24 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 20 12 4l8 16" />
                  <path d="M7.5 14h9" />
                </svg>
              </div>
              <p className="text-sm text-ink-300">
                I remember things across conversations, can load skills,
                <br />
                and can build files — decks, spreadsheets, code — in my sandbox.
              </p>
            </div>
          )}
          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent/15 px-4 py-2.5">
                  {msg.images.map((src, j) => (
                    <img key={j} src={src} className="mb-2 max-h-48 rounded-lg" />
                  ))}
                  <p className="whitespace-pre-wrap text-sm text-cream">{msg.text}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-accent">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4 20 12 4l8 16" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  {msg.blocks.length === 0 && streaming && i === messages.length - 1 && (
                    <div className="flex gap-1 py-2">
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-400" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-400" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-400" />
                    </div>
                  )}
                  {msg.blocks.map((block, j) =>
                    block.kind === 'text' ? (
                      <Markdown key={j} source={block.text} />
                    ) : block.kind === 'tool' ? (
                      <ToolChip key={j} block={block} />
                    ) : (
                      <div
                        key={j}
                        className="my-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
                      >
                        {block.message}
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <div className="border-t border-ink-800 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1 text-[11px] text-ink-300"
                >
                  {att.name}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="text-ink-400 hover:text-danger"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="rounded-2xl border border-ink-700 bg-ink-900 p-2 focus-within:border-ink-600">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={Math.min(6, Math.max(1, input.split('\n').length))}
              placeholder="Message mondainai… (Enter to send, Shift+Enter for a new line)"
              className="w-full resize-none bg-transparent px-2 py-1.5 text-sm text-cream placeholder-ink-600 outline-none"
            />
            <div className="flex items-center justify-between px-1 pt-1">
              <div className="flex items-center gap-2">
                <SkillPicker
                  skills={skills}
                  active={resolvedActive}
                  onToggle={(name) =>
                    setActiveSkills(() => {
                      const next = new Set<string>(resolvedActive)
                      if (next.has(name)) next.delete(name)
                      else next.add(name)
                      return next
                    })
                  }
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach images or PDFs"
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-xs text-ink-400 transition-colors hover:text-cream"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                  Attach
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    void onPickFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </div>
              {streaming ? (
                <button
                  onClick={() => void window.api.chat.stop()}
                  className="rounded-lg bg-danger/15 px-4 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/25"
                >
                  ■ Stop
                </button>
              ) : (
                <button
                  onClick={() => void send()}
                  disabled={!input.trim()}
                  className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:bg-accent-hover disabled:opacity-40"
                >
                  Send ↵
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
