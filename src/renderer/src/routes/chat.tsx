import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import type { ChatAttachment, SkillMeta } from '../../../shared/types'
import { contextWindowForModel } from '../../../shared/types'
import { Markdown } from '../components/Markdown'
import {
  beginUserTurn,
  chatsStore,
  createChat,
  initChatEvents,
  markStopped,
  recordAnswers,
  removeChat,
  setActiveChat,
  type AssistantBlock,
  type ChatState,
  type ChatStatus
} from '../stores/chats'

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

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

function formatDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.round(minutes / 60)}h`
}

function ContextGauge({
  tokens,
  contextWindow
}: {
  tokens: number
  contextWindow: number
}): React.JSX.Element {
  const fraction = Math.min(1, tokens / contextWindow)
  const percent = Math.round(fraction * 100)
  const radius = 8
  const circumference = 2 * Math.PI * radius
  const stroke =
    fraction >= 0.9 ? 'stroke-danger' : fraction >= 0.7 ? 'stroke-warn' : 'stroke-accent'
  return (
    <div
      title={`Context: ${tokens.toLocaleString()} of ${contextWindow.toLocaleString()} tokens (${percent}%)`}
      className="flex items-center gap-2 rounded-lg border border-ink-700 px-2.5 py-1.5"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4 -rotate-90">
        <circle cx="10" cy="10" r={radius} fill="none" strokeWidth="3" className="stroke-ink-700" />
        <circle
          cx="10"
          cy="10"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${circumference * fraction} ${circumference}`}
          className={`${stroke} transition-all duration-500`}
        />
      </svg>
      <span className="text-[11px] tabular-nums text-ink-400">
        {percent}% · {formatTokens(tokens)}/{formatTokens(contextWindow)}
      </span>
    </div>
  )
}

function CompactionChip({
  block
}: {
  block: Extract<AssistantBlock, { kind: 'compaction' }>
}): React.JSX.Element {
  return (
    <div className="my-1.5 flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-1.5 text-xs text-ink-300">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${block.done ? 'bg-ok' : 'animate-pulse bg-warn'}`}
      />
      {block.done ? (
        <span>
          Context compacted
          {block.tokensBefore != null && block.tokensAfter != null && (
            <span className="text-ink-400">
              {' '}
              · {formatTokens(block.tokensBefore)} → {formatTokens(block.tokensAfter)} tokens
            </span>
          )}
        </span>
      ) : (
        <span>Compacting conversation to fit the context window…</span>
      )}
    </div>
  )
}

// --- chat list -------------------------------------------------------------

function StatusIcon({ status }: { status: ChatStatus }): React.JSX.Element {
  switch (status) {
    case 'running':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-accent" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 3a9 9 0 1 1-9 9" strokeLinecap="round" />
        </svg>
      )
    case 'needs_input':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-warn" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.1 9.3a3 3 0 0 1 5.8 1c0 2-2.9 2.6-2.9 4.2" strokeLinecap="round" />
          <path d="M12 17.5h.01" strokeLinecap="round" />
        </svg>
      )
    case 'error':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-danger" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" strokeLinecap="round" />
          <path d="M12 16.5h.01" strokeLinecap="round" />
        </svg>
      )
    case 'done':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-400" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="m8.4 12.4 2.4 2.4 4.8-5.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-600" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
        </svg>
      )
  }
}

function chatSubtitle(chat: ChatState): string {
  switch (chat.status) {
    case 'idle':
      return 'No messages yet'
    case 'needs_input':
      return 'Needs your input'
    default:
      return chat.activity || '—'
  }
}

function ChatListItem({
  chat,
  active,
  onSelect,
  onRemove
}: {
  chat: ChatState
  active: boolean
  onSelect: () => void
  onRemove: () => void
}): React.JSX.Element {
  const duration =
    (chat.status === 'done' || chat.status === 'error') && chat.startedAt && chat.finishedAt
      ? formatDuration(chat.finishedAt - chat.startedAt)
      : null
  return (
    <div
      onClick={onSelect}
      className={`group flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
        active ? 'bg-ink-800' : 'hover:bg-ink-850'
      }`}
    >
      <span className="mt-0.5 shrink-0">
        <StatusIcon status={chat.status} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-cream">{chat.title}</span>
        <span
          className={`block truncate text-[11px] ${
            chat.status === 'needs_input'
              ? 'text-warn'
              : chat.status === 'error'
                ? 'text-danger'
                : 'text-ink-400'
          }`}
        >
          {chatSubtitle(chat)}
        </span>
      </span>
      {duration && <span className="mt-0.5 shrink-0 text-[10px] tabular-nums text-ink-400">{duration}</span>}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        title="Delete chat"
        className="mt-0.5 hidden shrink-0 text-ink-600 hover:text-danger group-hover:block"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function ChatList(): React.JSX.Element {
  const { order, chats, activeId } = useStore(chatsStore)

  const groups = useMemo(() => {
    const pick = (statuses: ChatStatus[]): ChatState[] =>
      order.map((id) => chats[id]).filter((c) => c && statuses.includes(c.status))
    return [
      { label: 'New', items: pick(['idle']) },
      { label: 'In progress', items: pick(['running', 'needs_input']) },
      { label: 'Done', items: pick(['done', 'error']) }
    ].filter((g) => g.items.length > 0)
  }, [order, chats])

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ink-800 bg-ink-900/50">
      <div className="flex items-center justify-between px-4 py-3.5">
        <h2 className="text-sm font-semibold">Chats</h2>
        <button
          onClick={() => createChat()}
          title="New chat"
          className="flex items-center gap-1 rounded-lg border border-ink-700 px-2 py-1 text-xs text-ink-300 transition-colors hover:border-ink-600 hover:text-cream"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
              {group.label} {group.items.length}
            </div>
            <div className="space-y-0.5">
              {group.items.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeId}
                  onSelect={() => setActiveChat(chat.id)}
                  onRemove={() => removeChat(chat.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

// --- ask_user_questions card -------------------------------------------------

function QuestionCard({
  chatId,
  block,
  interactive
}: {
  chatId: string
  block: Extract<AssistantBlock, { kind: 'question' }>
  interactive: boolean
}): React.JSX.Element {
  const [selected, setSelected] = useState<Set<number>[]>(() => block.questions.map(() => new Set<number>()))
  const [custom, setCustom] = useState<string[]>(() => block.questions.map(() => ''))
  const answered = block.answers !== null

  const toggle = (qi: number, oi: number, multi: boolean): void => {
    setSelected((prev) =>
      prev.map((set, i) => {
        if (i !== qi) return set
        const next = new Set(set)
        if (next.has(oi)) next.delete(oi)
        else {
          if (!multi) next.clear()
          next.add(oi)
        }
        return next
      })
    )
  }

  const canSubmit = block.questions.every((_, i) => selected[i].size > 0 || custom[i].trim())

  const submit = (): void => {
    if (!canSubmit) return
    const answers = block.questions.map((q, i) => {
      const chosen = [...selected[i]].sort((a, b) => a - b).map((oi) => q.options[oi].label)
      const extra = custom[i].trim()
      return extra ? [...chosen, extra] : chosen
    })
    recordAnswers(chatId, block.toolUseId, answers)
    void window.api.chat.answer(chatId, { toolUseId: block.toolUseId, answers })
  }

  const isChosen = (qi: number, label: string): boolean =>
    answered ? (block.answers![qi] ?? []).includes(label) : selected[qi].has(block.questions[qi].options.findIndex((o) => o.label === label))

  return (
    <div className={`my-2 rounded-xl border p-4 ${answered ? 'border-ink-700 bg-ink-900' : 'border-warn/40 bg-warn/5'}`}>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium">
        <StatusIcon status={answered ? 'done' : 'needs_input'} />
        <span className={answered ? 'text-ink-400' : 'text-warn'}>
          {answered ? 'Answered' : 'The assistant needs your input'}
        </span>
      </div>
      <div className="space-y-4">
        {block.questions.map((q, qi) => {
          const customAnswer = answered
            ? (block.answers![qi] ?? []).find((a) => !q.options.some((o) => o.label === a))
            : undefined
          return (
            <div key={qi}>
              {q.header && (
                <span className="mb-1.5 inline-block rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300">
                  {q.header}
                </span>
              )}
              <p className="mb-2 text-sm text-cream">{q.question}</p>
              <div className="flex flex-col gap-1.5">
                {q.options.map((opt, oi) => {
                  const chosen = isChosen(qi, opt.label)
                  return (
                    <button
                      key={oi}
                      disabled={!interactive || answered}
                      onClick={() => toggle(qi, oi, q.multiSelect)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:cursor-default ${
                        chosen
                          ? 'border-accent/60 bg-accent/15 text-cream'
                          : answered || !interactive
                            ? 'border-ink-800 text-ink-600'
                            : 'border-ink-700 text-ink-300 hover:border-ink-600 hover:text-cream'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border ${
                            q.multiSelect ? 'rounded' : 'rounded-full'
                          } ${chosen ? 'border-accent bg-accent' : 'border-ink-600'}`}
                        >
                          {chosen && (
                            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-ink-950" fill="none" stroke="currentColor" strokeWidth="4">
                              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="font-medium">{opt.label}</span>
                      </span>
                      {opt.description && (
                        <span className="mt-0.5 block pl-5.5 text-[11px] text-ink-400">{opt.description}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {!answered && interactive && (
                <input
                  value={custom[qi]}
                  onChange={(e) =>
                    setCustom((prev) => prev.map((v, i) => (i === qi ? e.target.value : v)))
                  }
                  placeholder="Or type a custom answer…"
                  className="mt-1.5 w-full rounded-lg border border-ink-700 bg-transparent px-3 py-2 text-xs text-cream placeholder-ink-600 outline-none focus:border-ink-600"
                />
              )}
              {answered && customAnswer && (
                <div className="mt-1.5 rounded-lg border border-accent/60 bg-accent/15 px-3 py-2 text-xs text-cream">
                  ✎ {customAnswer}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {!answered && interactive && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            Submit answers
          </button>
        </div>
      )}
      {!answered && !interactive && (
        <p className="mt-3 text-[11px] text-ink-600">These questions were dismissed.</p>
      )}
    </div>
  )
}

// --- skill picker ------------------------------------------------------------

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

// --- route ---------------------------------------------------------------

export function ChatRoute(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { chats, activeId } = useStore(chatsStore)
  const chat = chats[activeId]
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<Record<string, ChatAttachment[]>>({})
  const [activeSkills, setActiveSkills] = useState<Set<string> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const input = drafts[activeId] ?? ''
  const chatAttachments = attachments[activeId] ?? []
  const streaming = chat?.status === 'running' || chat?.status === 'needs_input'

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
    initChatEvents(() => {
      // memory / sandbox may have changed during the turn
      queryClient.invalidateQueries({ queryKey: ['sandbox'] })
      queryClient.invalidateQueries({ queryKey: ['memory'] })
    })
  }, [queryClient])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [chat?.messages, activeId])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming || !chat) return
    const toSend = chatAttachments
    beginUserTurn(
      activeId,
      text,
      toSend
        .filter((a) => a.mediaType.startsWith('image/'))
        .map((a) => `data:${a.mediaType};base64,${a.dataBase64}`)
    )
    setDrafts((prev) => ({ ...prev, [activeId]: '' }))
    setAttachments((prev) => ({ ...prev, [activeId]: [] }))
    await window.api.chat.send(activeId, {
      text,
      attachments: toSend,
      activeSkills: [...resolvedActive]
    })
  }, [input, streaming, chat, chatAttachments, activeId, resolvedActive])

  const onPickFiles = useCallback(
    async (files: FileList | null) => {
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
      setAttachments((prev) => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), ...list] }))
    },
    [activeId]
  )

  const stop = useCallback(() => {
    markStopped(activeId)
    void window.api.chat.stop(activeId)
  }, [activeId])

  const contextWindow = contextWindowForModel(settings?.model ?? '')
  const noKey = settings && !settings.apiKey

  if (!chat) return <div />

  return (
    <div className="flex h-full">
      <ChatList />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink-800 px-6 py-3.5">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{chat.title}</h1>
            <p className="text-[11px] text-ink-400">
              {settings?.model ?? ''} · {resolvedActive.size} skill
              {resolvedActive.size === 1 ? '' : 's'} active
            </p>
          </div>
          <ContextGauge tokens={chat.contextTokens} contextWindow={contextWindow} />
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {noKey && (
              <div className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
                No Anthropic API key configured yet — add one in Settings to start chatting.
              </div>
            )}
            {chat.messages.length === 0 && !noKey && (
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
                  <br />
                  Run several chats at once; each keeps working in the background.
                </p>
              </div>
            )}
            {chat.messages.map((msg, i) =>
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
                    {msg.blocks.length === 0 &&
                      chat.status === 'running' &&
                      i === chat.messages.length - 1 && (
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
                      ) : block.kind === 'question' ? (
                        <QuestionCard
                          key={block.toolUseId}
                          chatId={chat.id}
                          block={block}
                          interactive={block.answers !== null || chat.status === 'needs_input'}
                        />
                      ) : block.kind === 'compaction' ? (
                        <CompactionChip key={j} block={block} />
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
            {chatAttachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {chatAttachments.map((att, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1 text-[11px] text-ink-300"
                  >
                    {att.name}
                    <button
                      onClick={() =>
                        setAttachments((prev) => ({
                          ...prev,
                          [activeId]: (prev[activeId] ?? []).filter((_, j) => j !== i)
                        }))
                      }
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
                onChange={(e) => setDrafts((prev) => ({ ...prev, [activeId]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
                rows={Math.min(6, Math.max(1, input.split('\n').length))}
                placeholder={
                  chat.status === 'needs_input'
                    ? 'Answer the questions above to continue…'
                    : 'Message mondainai… (Enter to send, Shift+Enter for a new line)'
                }
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
                    onClick={stop}
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
    </div>
  )
}
