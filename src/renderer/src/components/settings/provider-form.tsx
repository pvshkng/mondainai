import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type {
  ProviderId,
  ProviderSettings,
  ProviderSummary,
  SaveProviderInput,
} from "@shared/provider-types";

function fieldValue(settings: ProviderSettings, key: string): string {
  const value = settings[key];
  if (typeof value === "string") return value;
  return "";
}

export function ProviderForm({
  provider,
  onSaved,
  onDeleted,
}: {
  provider: ProviderSummary;
  onSaved: (providers: ProviderSummary[]) => void;
  onDeleted: (providers: ProviderSummary[]) => void;
}) {
  const [enabled, setEnabled] = useState(provider.enabled);
  const [settings, setSettings] = useState<ProviderSettings>(provider.settings);
  const [secretInputs, setSecretInputs] = useState<Record<string, string>>({});
  const [customModels, setCustomModels] = useState<string[]>(provider.customModels);
  const [newModelId, setNewModelId] = useState("");
  const [busy, setBusy] = useState<"save" | "test" | "delete" | null>(null);
  const [testResult, setTestResult] = useState<
    { ok: true; sampleModel: string } | { ok: false; error: string } | null
  >(null);

  const buildInput = (): SaveProviderInput => ({
    enabled,
    settings,
    secrets: secretInputs,
    customModels,
  });

  const handleSave = async () => {
    setBusy("save");
    setTestResult(null);
    try {
      const updated = await window.api.providers.save(
        provider.id as ProviderId,
        buildInput(),
      );
      setSecretInputs({});
      onSaved(updated);
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    setBusy("test");
    setTestResult(null);
    try {
      const result = await window.api.providers.test(
        provider.id as ProviderId,
        buildInput(),
      );
      setTestResult(result);
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy("delete");
    try {
      const updated = await window.api.providers.delete(provider.id as ProviderId);
      onDeleted(updated);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border/50 bg-background/40 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">{provider.label}</div>
          <div className="text-[11px] text-muted-foreground">
            {provider.configured ? "Configured" : "Not configured"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Enabled</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      <div className="space-y-3">
        {provider.fields.map((field) => {
          if (field.secret) {
            const preview = provider.secretPreviews[field.key];
            return (
              <div key={field.key} className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive"> *</span>}
                </label>
                <Input
                  type="password"
                  value={secretInputs[field.key] ?? ""}
                  placeholder={preview ? `Saved: ${preview}` : field.placeholder}
                  onChange={(e) =>
                    setSecretInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
                {field.helpText && (
                  <p className="text-[10px] text-muted-foreground/70">{field.helpText}</p>
                )}
              </div>
            );
          }

          if (field.type === "checkbox") {
            return (
              <div key={field.key} className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {field.label}
                </label>
                <Switch
                  checked={Boolean(settings[field.key])}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, [field.key]: checked }))
                  }
                />
              </div>
            );
          }

          if (field.type === "textarea") {
            return (
              <div key={field.key} className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  {field.label}
                </label>
                <Textarea
                  rows={4}
                  value={fieldValue(settings, field.key)}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                />
                {field.helpText && (
                  <p className="text-[10px] text-muted-foreground/70">{field.helpText}</p>
                )}
              </div>
            );
          }

          return (
            <div key={field.key} className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </label>
              <Input
                value={fieldValue(settings, field.key)}
                placeholder={field.placeholder}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              />
              {field.helpText && (
                <p className="text-[10px] text-muted-foreground/70">{field.helpText}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground">
          {provider.modelsAreCustomOnly ? "Deployment / model IDs" : "Custom model IDs"}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {customModels.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] text-foreground"
            >
              {id}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setCustomModels((prev) => prev.filter((m) => m !== id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input
            value={newModelId}
            placeholder={provider.modelsAreCustomOnly ? "e.g. my-gpt4-deployment" : "e.g. gpt-5.2"}
            onChange={(e) => setNewModelId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newModelId.trim()) {
                e.preventDefault();
                setCustomModels((prev) => [...prev, newModelId.trim()]);
                setNewModelId("");
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!newModelId.trim()}
            onClick={() => {
              setCustomModels((prev) => [...prev, newModelId.trim()]);
              setNewModelId("");
            }}
          >
            Add
          </Button>
        </div>
      </div>

      {testResult && (
        <p className={testResult.ok ? "text-[11px] text-emerald-500" : "text-[11px] text-destructive"}>
          {testResult.ok
            ? `Test succeeded using ${testResult.sampleModel}.`
            : `Test failed: ${testResult.error}`}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={busy !== null}
          onClick={handleDelete}
        >
          Remove
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy !== null}
            onClick={handleTest}
          >
            {busy === "test" ? "Testing..." : "Test"}
          </Button>
          <Button type="button" size="sm" disabled={busy !== null} onClick={handleSave}>
            {busy === "save" ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
