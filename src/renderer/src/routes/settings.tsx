import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MODEL_OPTIONS } from '../../../shared/types'

export function SettingsRoute(): React.JSX.Element {
  const queryClient = useQueryClient()
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => window.api.settings.get()
  })
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('claude-opus-4-8')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setApiKey(settings.apiKey)
      setModel(settings.model)
    }
  }, [settings])

  const save = useMutation({
    mutationFn: () => window.api.settings.set({ apiKey: apiKey.trim(), model }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  })

  const dirty = settings ? apiKey.trim() !== settings.apiKey || model !== settings.model : false

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <header className="pb-6">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-xs text-ink-400">Model and API configuration, stored locally.</p>
      </header>

      <div className="max-w-lg space-y-6">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-300">Anthropic API key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
              spellCheck={false}
              className="flex-1 rounded-xl border border-ink-700 bg-ink-900 px-4 py-2.5 font-mono text-xs text-cream placeholder-ink-600 outline-none focus:border-ink-600"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="rounded-xl border border-ink-700 px-3 text-xs text-ink-400 hover:text-cream"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-ink-600">
            Get one at console.anthropic.com. Stored unencrypted in the app&apos;s local data folder.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-300">Model</label>
          <div className="space-y-2">
            {MODEL_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                  model === option.id
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-ink-700 bg-ink-900 hover:border-ink-600'
                }`}
              >
                <span>
                  <span className="block text-sm text-cream">{option.label}</span>
                  <span className="block font-mono text-[10px] text-ink-500">{option.id}</span>
                </span>
                <input
                  type="radio"
                  name="model"
                  checked={model === option.id}
                  onChange={() => setModel(option.id)}
                  className="accent-[#d97757]"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            className="rounded-xl bg-accent px-5 py-2 text-xs font-medium text-ink-950 hover:bg-accent-hover disabled:opacity-40"
          >
            {save.isPending ? 'Saving…' : 'Save settings'}
          </button>
          {saved && <span className="text-xs text-ok">Saved ✓</span>}
        </div>
      </div>
    </div>
  )
}
