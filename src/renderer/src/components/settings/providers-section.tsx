import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderSummary } from "@shared/provider-types";
import { ProviderForm } from "./provider-form";

export function ProvidersSection() {
  const [providers, setProviders] = useState<ProviderSummary[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    window.api.providers.list().then(setProviders);
  }, []);

  if (!providers) {
    return <p className="text-xs text-muted-foreground">Loading providers...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-foreground">Providers</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Your API key and other settings are stored locally on this device and are only
          sent to the provider you configure them for. Nothing is uploaded anywhere else.
        </p>
      </div>

      <div className="space-y-2">
        {providers.map((provider) => {
          const isOpen = expanded === provider.id;
          return (
            <div key={provider.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-left transition-colors hover:bg-accent/20"
                onClick={() => setExpanded(isOpen ? null : provider.id)}
              >
                {isOpen ? (
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                )}
                <span className="flex-1 text-[13px] font-medium text-foreground">
                  {provider.label}
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    provider.configured && provider.enabled
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {provider.configured
                    ? provider.enabled
                      ? "Configured"
                      : "Disabled"
                    : "Not configured"}
                </span>
              </button>
              {isOpen && (
                <div className="mt-2">
                  <ProviderForm
                    provider={provider}
                    onSaved={setProviders}
                    onDeleted={setProviders}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
