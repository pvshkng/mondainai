import { useEffect, useMemo, useState } from 'react'
import { read, utils, type WorkBook } from 'xlsx'
import type { ArtifactInfo, ArtifactKind } from '../../../shared/types'

const KIND_META: Record<ArtifactKind, { label: string; letter: string; bg: string }> = {
  excel: { label: 'Excel', letter: 'X', bg: 'bg-[#1d6f42]' },
  csv: { label: 'CSV', letter: 'C', bg: 'bg-[#1d6f42]' },
  powerpoint: { label: 'PowerPoint', letter: 'P', bg: 'bg-[#c43e1c]' },
  word: { label: 'Word', letter: 'W', bg: 'bg-[#2b579a]' },
  pdf: { label: 'PDF', letter: 'P', bg: 'bg-[#b30b00]' },
  image: { label: 'Image', letter: 'I', bg: 'bg-[#7048a8]' },
  text: { label: 'Text', letter: 'T', bg: 'bg-ink-600' },
  other: { label: 'File', letter: 'F', bg: 'bg-ink-600' }
}

export function formatBytes(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`
  if (size >= 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${size} B`
}

function FileIcon({ kind, large }: { kind: ArtifactKind; large?: boolean }): React.JSX.Element {
  const meta = KIND_META[kind]
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg font-semibold text-white ${meta.bg} ${
        large ? 'h-16 w-16 text-2xl' : 'h-10 w-10 text-base'
      }`}
    >
      {meta.letter}
    </span>
  )
}

/** Clickable file card shown in the chat when the agent shares an artifact. */
export function ArtifactCard({
  artifact,
  onOpen
}: {
  artifact: ArtifactInfo
  onOpen: (artifact: ArtifactInfo) => void
}): React.JSX.Element {
  return (
    <button
      onClick={() => onOpen(artifact)}
      title="Click to preview"
      className="my-2 flex w-full max-w-md items-center gap-3 rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-left transition-colors hover:border-ink-600 hover:bg-ink-800"
    >
      <FileIcon kind={artifact.kind} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-cream">{artifact.name}</span>
        <span className="block text-xs text-ink-400">
          {KIND_META[artifact.kind].label} · {formatBytes(artifact.size)}
        </span>
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Preview renderers

const MAX_PREVIEW_ROWS = 200
const MAX_PREVIEW_COLS = 40

type Cell = string | number | boolean | null | undefined

function SpreadsheetPreview({ dataBase64 }: { dataBase64: string }): React.JSX.Element {
  const workbook: WorkBook = useMemo(() => read(dataBase64, { type: 'base64' }), [dataBase64])
  const [sheetName, setSheetName] = useState(workbook.SheetNames[0])
  const activeSheet = workbook.SheetNames.includes(sheetName) ? sheetName : workbook.SheetNames[0]

  const rows: Cell[][] = useMemo(() => {
    const sheet = workbook.Sheets[activeSheet]
    if (!sheet) return []
    const all = utils.sheet_to_json<Cell[]>(sheet, { header: 1, defval: '' })
    return all.slice(0, MAX_PREVIEW_ROWS + 1).map((r) => r.slice(0, MAX_PREVIEW_COLS))
  }, [workbook, activeSheet])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {workbook.SheetNames.length > 1 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-ink-800 px-3 py-2">
          {workbook.SheetNames.map((name) => (
            <button
              key={name}
              onClick={() => setSheetName(name)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs transition-colors ${
                name === activeSheet
                  ? 'bg-accent/15 font-medium text-accent'
                  : 'text-ink-400 hover:bg-ink-800 hover:text-cream'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className="sticky left-0 border border-ink-800 bg-ink-900 px-2 py-1 text-center tabular-nums text-ink-600">
                  {i + 1}
                </td>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`max-w-56 truncate border border-ink-800 px-2 py-1 ${
                      i === 0 ? 'bg-ink-850 font-semibold text-cream' : 'text-ink-300'
                    }`}
                  >
                    {String(cell ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > MAX_PREVIEW_ROWS && (
          <p className="px-3 py-2 text-center text-[11px] text-ink-600">
            Preview truncated at {MAX_PREVIEW_ROWS} rows — save the file to see everything.
          </p>
        )}
      </div>
    </div>
  )
}

function decodeBase64Text(dataBase64: string): string {
  const bytes = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

// Chromium won't render data: URIs in iframes, so PDFs go through a blob URL.
function PdfPreview({ dataBase64, name }: { dataBase64: string; name: string }): React.JSX.Element {
  const url = useMemo(() => {
    const bytes = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0))
    return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  }, [dataBase64])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <iframe title={name} src={url} className="h-full w-full" />
}

function PreviewBody({
  artifact,
  dataBase64
}: {
  artifact: ArtifactInfo
  dataBase64: string
}): React.JSX.Element {
  switch (artifact.kind) {
    case 'excel':
    case 'csv':
      return <SpreadsheetPreview dataBase64={dataBase64} />
    case 'image':
      return (
        <div className="flex h-full items-center justify-center overflow-auto p-4">
          <img
            src={`data:${artifact.mediaType};base64,${dataBase64}`}
            alt={artifact.name}
            className="max-h-full max-w-full rounded-lg"
          />
        </div>
      )
    case 'pdf':
      return <PdfPreview dataBase64={dataBase64} name={artifact.name} />
    case 'text':
      return (
        <pre className="h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-ink-300">
          {decodeBase64Text(dataBase64)}
        </pre>
      )
    default:
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <FileIcon kind={artifact.kind} large />
          <div>
            <p className="text-sm font-medium text-cream">{artifact.name}</p>
            <p className="mt-1 text-xs text-ink-400">
              {KIND_META[artifact.kind].label} · {formatBytes(artifact.size)}
            </p>
          </div>
          <p className="max-w-60 text-xs text-ink-400">
            No inline preview for this file type — save it to your device to open it.
          </p>
        </div>
      )
  }
}

/** Right sidebar that previews an artifact and lets the user save it locally. */
export function ArtifactPreviewPanel({
  artifact,
  onClose
}: {
  artifact: ArtifactInfo
  onClose: () => void
}): React.JSX.Element {
  const [dataBase64, setDataBase64] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedTo, setSavedTo] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDataBase64(null)
    setError(null)
    setSavedTo(null)
    window.api.sandbox
      .readFileBase64(artifact.path)
      .then((data) => {
        if (!cancelled) setDataBase64(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [artifact])

  const save = async (): Promise<void> => {
    const destination = await window.api.sandbox.saveFileAs(artifact.path, artifact.name)
    if (destination) setSavedTo(destination)
  }

  return (
    <aside className="flex w-[420px] shrink-0 flex-col border-l border-ink-800 bg-ink-900">
      <header className="flex shrink-0 items-center gap-3 border-b border-ink-800 px-4 py-3">
        <FileIcon kind={artifact.kind} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-cream">{artifact.name}</p>
          <p className="text-[11px] text-ink-400">
            {KIND_META[artifact.kind].label} · {formatBytes(artifact.size)}
          </p>
        </div>
        <button
          onClick={onClose}
          title="Close preview"
          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-cream"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 bg-ink-950/40">
        {error ? (
          <div className="p-4">
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              Could not load preview: {error}
            </div>
          </div>
        ) : dataBase64 == null ? (
          <div className="flex h-full items-center justify-center text-xs text-ink-400">
            Loading preview…
          </div>
        ) : (
          <PreviewBody artifact={artifact} dataBase64={dataBase64} />
        )}
      </div>

      <footer className="shrink-0 border-t border-ink-800 px-4 py-3">
        <button
          onClick={() => void save()}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-ink-950 transition-colors hover:bg-accent-hover"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          Save to device
        </button>
        {savedTo && <p className="mt-2 truncate text-center text-[11px] text-ok">Saved to {savedTo}</p>}
      </footer>
    </aside>
  )
}
