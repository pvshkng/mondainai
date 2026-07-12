import { useEffect, useState } from "react";
import type { ConfiguredModel } from "@shared/provider-types";
import { useSettingsModalStore } from "@/store/settings-modal-store";

/**
 * Tracks the models available from configured providers. Refetches whenever the
 * settings modal closes, so gating (e.g. the chat input) reacts as soon as the
 * user adds or removes a provider.
 */
export function useConfiguredModels(): {
  models: ConfiguredModel[];
  loading: boolean;
  hasProvider: boolean;
} {
  const [models, setModels] = useState<ConfiguredModel[] | null>(null);
  const settingsOpen = useSettingsModalStore((s) => s.open);

  useEffect(() => {
    // While the settings modal is open the list may be mid-edit; wait until it
    // closes to (re)load so we reflect the committed provider configuration.
    if (settingsOpen) return;
    let cancelled = false;
    window.api.providers.models().then((list) => {
      if (!cancelled) setModels(list);
    });
    return () => {
      cancelled = true;
    };
  }, [settingsOpen]);

  return {
    models: models ?? [],
    loading: models === null,
    hasProvider: (models?.length ?? 0) > 0,
  };
}
