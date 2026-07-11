import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

const TEXT_EXTENSIONS = /\.(txt|md|json|js|cjs|mjs|ts|tsx|jsx|py|html|css|csv|yml|yaml|xml|sh|log|toml|gitignore)$/i

export function SandboxRoute(): React.JSX.Element {
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<{ path: string; content: string } | null>(null)

  const { data: info } = useQuery({
    queryKey: ['sandbox', 'info'],
    queryFn: () => window.api.sandbox.info()
  })
  const { data: entries = [] } = useQuery({
    queryKey: ['sandbox', 'list'],
    queryFn: () => window.api.sandbox.list()
  })

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['sandbox'] })
  }
  const reset = useMutation({
    mutationFn: () => window.api.sandbox.reset(),
    onSuccess: () => {
      setPreview(null)
      refresh()
    }
  })

  const openFile = async (path: string): Promise<void> => {
    try {
      setPreview({ path, content: await window.api.sandbox.readFile(path) })
    } catch (err) {
      setPreview({ path, content: `Could not read file: ${(err as Error).message}` })
    }
  }

  return (
    <div className="flex h-full flex-col px-8 py-6">
      <header className="flex items-start justify-between pb-5">
        <div>
          <h1 className="text-lg font-semibold">Sandbox</h1>
          <p className="text-xs text-ink-400">
            The assistant&apos;s local workspace — where it runs commands, commits code, and creates files
            like .pptx and .xlsx.
          </p>
          {info && (
            <p className="mt-1.5 font-mono text-[11px] text-ink-600">
              {info.root} · {info.fileCount} files · {formatBytes(info.totalSize)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void window.api.sandbox.openFolder()}
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:text-cream"
          >
            Open folder
          </button>
          <button
            onClick={refresh}
            className="rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:text-cream"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              if (confirm('Delete everything in the sandbox? This cannot be undone.')) reset.mutate()
            }}
            className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="w-80 shrink-0 overflow-y-auto rounded-xl border border-ink-800 bg-ink-900">
          {entries.length === 0 ? (
            <div className="px-4 py-12 text-center text-xs text-ink-600">
              The sandbox is empty. Ask the assistant to create something —
              <br />
              &ldquo;make me a 3-slide deck about foxes&rdquo;.
            </div>
          ) : (
            <ul className="p-2">
              {entries.map((entry) => (
                <li key={entry.path}>
                  <button
                    disabled={entry.type === 'dir'}
                    onClick={() => entry.type === 'file' && void openFile(entry.path)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs ${
                      entry.type === 'dir'
                        ? 'cursor-default text-ink-400'
                        : preview?.path === entry.path
                          ? 'bg-accent/15 text-accent'
                          : 'text-ink-300 hover:bg-ink-800'
                    }`}
                    style={{ paddingLeft: `${10 + entry.path.split('/').length * 10}px` }}
                  >
                    <span className="shrink-0">{entry.type === 'dir' ? '▸' : '·'}</span>
                    <span className="min-w-0 flex-1 truncate font-mono">{entry.name}</span>
                    {entry.type === 'file' && (
                      <span className="shrink-0 text-[10px] text-ink-600">{formatBytes(entry.size)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
          {preview ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-ink-800 px-4 py-2 font-mono text-[11px] text-ink-400">
                {preview.path}
              </div>
              {TEXT_EXTENSIONS.test(preview.path) || preview.content.length < 100_000 ? (
                <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-ink-300">
                  {preview.content}
                </pre>
              ) : (
                <div className="p-6 text-xs text-ink-400">Binary or very large file — open the folder to view it.</div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-ink-600">
              Select a file to preview it
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
