import { Fragment, useMemo } from 'react'

/**
 * Lightweight, dependency-free markdown renderer covering the constructs the
 * model actually emits in chat: fenced code, headings, lists, bold/italic,
 * inline code and paragraphs. No raw HTML is ever injected.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  // split on inline code first, then bold within the remainder
  const parts = text.split(/(`[^`]+`)/g)
  parts.forEach((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[0.85em] text-accent-hover"
        >
          {part.slice(1, -1)}
        </code>
      )
      return
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
    boldParts.forEach((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
        nodes.push(
          <strong key={`${keyPrefix}-b${i}-${j}`} className="font-semibold text-cream">
            {bp.slice(2, -2)}
          </strong>
        )
      } else if (bp) {
        nodes.push(<Fragment key={`${keyPrefix}-t${i}-${j}`}>{bp}</Fragment>)
      }
    })
  })
  return nodes
}

interface Segment {
  kind: 'code' | 'text'
  content: string
  lang?: string
}

function splitCodeFences(source: string): Segment[] {
  const segments: Segment[] = []
  const re = /```([\w+-]*)\n([\s\S]*?)(?:```|$)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(source)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', content: source.slice(lastIndex, match.index) })
    }
    segments.push({ kind: 'code', lang: match[1] || undefined, content: match[2] })
    lastIndex = re.lastIndex
  }
  if (lastIndex < source.length) {
    segments.push({ kind: 'text', content: source.slice(lastIndex) })
  }
  return segments
}

function TextSegment({ content }: { content: string }): React.JSX.Element {
  const blocks = content.split(/\n{2,}/).filter((b) => b.trim())
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split('\n')
        const heading = block.match(/^(#{1,4})\s+(.*)$/)
        if (heading && lines.length === 1) {
          const level = heading[1].length
          const cls =
            level === 1
              ? 'text-lg font-semibold'
              : level === 2
                ? 'text-base font-semibold'
                : 'text-sm font-semibold'
          return (
            <div key={bi} className={`${cls} mt-3 mb-1 text-cream`}>
              {renderInline(heading[2], `h${bi}`)}
            </div>
          )
        }
        const isList = lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l) || !l.trim())
        if (isList && lines.some((l) => l.trim())) {
          return (
            <ul key={bi} className="my-1.5 space-y-1 pl-1">
              {lines
                .filter((l) => l.trim())
                .map((l, li) => {
                  const item = l.replace(/^\s*([-*]|\d+\.)\s+/, '')
                  const marker = l.match(/^\s*(\d+)\./)?.[1]
                  return (
                    <li key={li} className="flex gap-2">
                      <span className="select-none text-accent">{marker ? `${marker}.` : '•'}</span>
                      <span className="min-w-0">{renderInline(item, `l${bi}-${li}`)}</span>
                    </li>
                  )
                })}
            </ul>
          )
        }
        return (
          <p key={bi} className="my-1.5 whitespace-pre-wrap leading-relaxed">
            {renderInline(block, `p${bi}`)}
          </p>
        )
      })}
    </>
  )
}

export function Markdown({ source }: { source: string }): React.JSX.Element {
  const segments = useMemo(() => splitCodeFences(source), [source])
  return (
    <div className="text-sm text-ink-300 [&>*:first-child]:mt-0">
      {segments.map((seg, i) =>
        seg.kind === 'code' ? (
          <div key={i} className="my-2 overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
            {seg.lang && (
              <div className="border-b border-ink-800 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                {seg.lang}
              </div>
            )}
            <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-cream">
              {seg.content}
            </pre>
          </div>
        ) : (
          <TextSegment key={i} content={seg.content} />
        )
      )}
    </div>
  )
}
