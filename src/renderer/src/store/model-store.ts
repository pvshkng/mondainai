import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderId } from "@shared/provider-types";

interface ModelSelection {
  providerId: ProviderId | null;
  modelId: string | null;
  setSelection: (providerId: ProviderId, modelId: string) => void;
  clearSelection: () => void;
}

export const useModelStore = create<ModelSelection>()(
  persist(
    (set) => ({
      providerId: null,
      modelId: null,
      setSelection: (providerId, modelId) => set({ providerId, modelId }),
      clearSelection: () => set({ providerId: null, modelId: null }),
    }),
    { name: "mondainai-model-selection" },
  ),
);
