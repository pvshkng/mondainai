import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MemoryFileName } from '../../../shared/types'

const TABS: { id: 'core' | 'notes' | 'conversations' | 'search'; label: string; hint: string }[] = [
  { id: 'core', label: 'Core memory', hint: 'Injected into every conversation — keep it short.' },
  { id: 'notes', label: 'Notes', hint: 'Detailed archival notes the assistant reads on demand.' },
  { id: 'conversations', label: 'Conversations', hint: 'Full turn history (recall memory).' },
  { id: 'search', label: 'Search', hint: 'Search across all memory files.' }
]

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

function MemoryEditor({ file }: { file: MemoryFileName }): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data: content = '', isLoading } = useQuery({
    queryKey: ['memory', file],
    queryFn: () => window.api.memory.read(file)
  })
  const [draft, setDraft] = useState<string | null>(null)
  const dirty = draft !== null && draft !== content

  useEffect(() => setDraft(null), [file])

  const save = useMutation({
    mutationFn: async () => {
      if (draft === null) return
      await window.api.memory.write(file, draft)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory'] })
      setDraft(null)
    }
  })

  if (isLoading) return <div className="p-6 text-sm text-ink-400">Loading…</div>

  return (
    <div className="flex h-full flex-col">
      <textarea
        value={draft ?? content}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        className="flex-1 resize-none rounded-xl border border-ink-700 bg-ink-900 p-4 font-mono text-xs leading-relaxed text-cream outline-none focus:border-ink-600"
      />
      <div className="flex items-center justify-end gap-3 pt-3">
        {dirty && <span className="text-[11px] text-warn">Unsaved changes</span>}
        <button
          onClick={() => setDraft(null)}
          disabled={!dirty}
          className="rounded-lg border border-ink-700 px-4 py-1.5 text-xs text-ink-300 hover:text-cream disabled:opacity-40"
        >
          Revert
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          className="rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-ink-950 hover:bg-accent-hover disabled:opacity-40"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function ConversationsView(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data: entries = [] } = useQuery({
    queryKey: ['memory', 'conversations-list'],
    queryFn: () => window.api.memory.conversations(300)
  })
  const clear = useMutation({
    mutationFn: () => window.api.memory.clearConversations(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memory'] })
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-3">
        <span className="text-xs text-ink-400">{entries.length} recorded turns (latest 300 shown)</span>
        <button
          onClick={() => {
            if (confirm('Clear all recorded conversation history? This cannot be undone.')) {
              clear.mutate()
            }
          }}
          className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
        >
          Clear history
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {entries.length === 0 && <div className="py-10 text-center text-sm text-ink-400">No conversation history yet.</div>}
        {[...entries].reverse().map((entry, i) => (
          <div key={i} className="rounded-xl border border-ink-800 bg-ink-900 px-4 py-3">
            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider">
              <span className={entry.role === 'user' ? 'text-accent' : 'text-ok'}>{entry.role}</span>
              <span className="text-ink-600">{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-ink-300">{entry.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchView(): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async (): Promise<void> => {
    if (!query.trim()) return
    setBusy(true)
    try {
      setResult(await window.api.memory.search(query.trim()))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 pb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run()}
          placeholder="Search memory (e.g. 'project deadline')"
          className="flex-1 rounded-xl border border-ink-700 bg-ink-900 px-4 py-2 text-sm text-cream placeholder-ink-600 outline-none focus:border-ink-600"
        />
        <button
          onClick={() => void run()}
          disabled={busy || !query.trim()}
          className="rounded-xl bg-accent px-5 py-2 text-xs font-medium text-ink-950 hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? 'Searching…' : 'Search'}
        </button>
      </div>
      {result !== null && (
        <pre className="flex-1 overflow-auto rounded-xl border border-ink-800 bg-ink-900 p-4 font-mono text-xs leading-relaxed text-ink-300">
          {result}
        </pre>
      )}
    </div>
  )
}

export function MemoryRoute(): React.JSX.Element {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('core')
  const { data: info = [] } = useQuery({
    queryKey: ['memory', 'info'],
    queryFn: () => window.api.memory.info()
  })

  const active = TABS.find((t) => t.id === tab)!

  return (
    <div className="flex h-full flex-col px-8 py-6">
      <header className="pb-5">
        <h1 className="text-lg font-semibold">Memory</h1>
        <p className="text-xs text-ink-400">
          What the assistant remembers about you, stored locally on this machine.
        </p>
      </header>

      <div className="flex gap-2 pb-4">
        {TABS.map((t) => {
          const fileInfo =
            t.id === 'core'
              ? info.find((i) => i.file === 'core.md')
              : t.id === 'notes'
                ? info.find((i) => i.file === 'notes.md')
                : t.id === 'conversations'
                  ? info.find((i) => i.file === 'conversations.jsonl')
                  : undefined
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3.5 py-2 text-xs transition-colors ${
                tab === t.id ? 'bg-accent/15 text-accent' : 'text-ink-400 hover:bg-ink-800 hover:text-cream'
              }`}
            >
              {t.label}
              {fileInfo && <span className="ml-1.5 text-[10px] text-ink-600">{formatBytes(fileInfo.size)}</span>}
            </button>
          )
        })}
      </div>
      <p className="pb-3 text-[11px] text-ink-600">{active.hint}</p>

      <div className="min-h-0 flex-1">
        {tab === 'core' && <MemoryEditor file="core.md" />}
        {tab === 'notes' && <MemoryEditor file="notes.md" />}
        {tab === 'conversations' && <ConversationsView />}
        {tab === 'search' && <SearchView />}
      </div>
    </div>
  )
}
