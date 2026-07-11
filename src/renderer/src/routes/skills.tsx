import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ImportResult, SkillMeta } from '../../../shared/types'
import { Markdown } from '../components/Markdown'

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (value: boolean) => void
}): React.JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-ink-700'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-cream transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SkillCard({
  skill,
  onView
}: {
  skill: SkillMeta
  onView: (name: string) => void
}): React.JSX.Element {
  const queryClient = useQueryClient()
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['skills'] })
  }
  const setEnabled = useMutation({
    mutationFn: (enabled: boolean) => window.api.skills.setEnabled(skill.name, enabled),
    onSuccess: invalidate
  })
  const remove = useMutation({
    mutationFn: () => window.api.skills.remove(skill.name),
    onSuccess: invalidate
  })

  return (
    <div
      className={`rounded-xl border bg-ink-900 p-4 transition-colors ${
        skill.enabled ? 'border-ink-700' : 'border-ink-800 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-cream">{skill.name}</h3>
            <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-ink-400">
              {skill.files.length} file{skill.files.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-400">{skill.description}</p>
          <p className="mt-2 truncate font-mono text-[10px] text-ink-600" title={skill.source}>
            {skill.source}
          </p>
        </div>
        <Toggle checked={skill.enabled} onChange={(v) => setEnabled.mutate(v)} />
      </div>
      <div className="mt-3 flex gap-2 border-t border-ink-800 pt-3">
        <button
          onClick={() => onView(skill.name)}
          className="rounded-lg border border-ink-700 px-3 py-1 text-[11px] text-ink-300 hover:text-cream"
        >
          View SKILL.md
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete skill '${skill.name}'? Its local files will be removed.`)) {
              remove.mutate()
            }
          }}
          className="rounded-lg border border-danger/30 px-3 py-1 text-[11px] text-danger hover:bg-danger/10"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export function SkillsRoute(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: () => window.api.skills.list()
  })
  const [githubUrl, setGithubUrl] = useState('')
  const [lastResult, setLastResult] = useState<ImportResult | null>(null)
  const [viewing, setViewing] = useState<{ name: string; content: string } | null>(null)

  const finishImport = (result: ImportResult): void => {
    setLastResult(result)
    void queryClient.invalidateQueries({ queryKey: ['skills'] })
  }

  const importGithub = useMutation({
    mutationFn: (url: string) => window.api.skills.importGithub(url),
    onSuccess: finishImport,
    onError: (err) => setLastResult({ imported: [], errors: [(err as Error).message] })
  })
  const importFolder = useMutation({
    mutationFn: () => window.api.skills.importFolder(),
    onSuccess: finishImport,
    onError: (err) => setLastResult({ imported: [], errors: [(err as Error).message] })
  })

  const view = async (name: string): Promise<void> => {
    const { content } = await window.api.skills.read(name)
    setViewing({ name, content })
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-8 py-6">
      <header className="pb-5">
        <h1 className="text-lg font-semibold">Skills</h1>
        <p className="text-xs text-ink-400">
          Folders of specialized instructions (SKILL.md) the assistant loads on demand. Skills stay local
          to this machine. Enabled skills appear in the chat composer&apos;s skill picker.
        </p>
      </header>

      <section className="mb-6 rounded-xl border border-ink-800 bg-ink-900 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-400">Add skills</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 gap-2">
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && githubUrl.trim()) importGithub.mutate(githubUrl.trim())
              }}
              placeholder="Paste a GitHub repo URL, e.g. https://github.com/anthropics/skills or owner/repo/tree/main/path"
              className="flex-1 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-cream placeholder-ink-600 outline-none focus:border-ink-600"
            />
            <button
              onClick={() => githubUrl.trim() && importGithub.mutate(githubUrl.trim())}
              disabled={importGithub.isPending || !githubUrl.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-ink-950 hover:bg-accent-hover disabled:opacity-40"
            >
              {importGithub.isPending ? 'Cloning…' : 'Import from GitHub'}
            </button>
          </div>
          <button
            onClick={() => importFolder.mutate()}
            disabled={importFolder.isPending}
            className="rounded-lg border border-ink-700 px-4 py-2 text-xs text-ink-300 hover:text-cream disabled:opacity-40"
          >
            {importFolder.isPending ? 'Importing…' : 'Upload folder…'}
          </button>
        </div>
        {lastResult && (
          <div className="mt-3 space-y-1 text-[11px]">
            {lastResult.imported.length > 0 && (
              <p className="text-ok">Imported: {lastResult.imported.join(', ')}</p>
            )}
            {lastResult.errors.map((err, i) => (
              <p key={i} className="text-danger">
                {err}
              </p>
            ))}
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="text-sm text-ink-400">Loading…</div>
      ) : skills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-700 px-6 py-14 text-center">
          <p className="text-sm text-ink-300">No skills installed yet.</p>
          <p className="mt-1 text-xs text-ink-600">
            Try importing from{' '}
            <span className="font-mono text-ink-400">https://github.com/anthropics/skills</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {skills.map((skill) => (
            <SkillCard key={skill.name} skill={skill} onView={(n) => void view(n)} />
          ))}
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-8"
          onClick={() => setViewing(null)}
        >
          <div
            className="flex max-h-full w-full max-w-2xl flex-col rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-800 px-5 py-3">
              <h3 className="text-sm font-semibold">{viewing.name} · SKILL.md</h3>
              <button onClick={() => setViewing(null)} className="text-ink-400 hover:text-cream">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <Markdown source={viewing.content} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
