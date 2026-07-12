import { create } from "zustand";
import { ThemePreset } from "@/types/theme";
import { defaultPresets } from "@/utils/theme-presets";

interface ThemePresetStore {
  presets: Record<string, ThemePreset>;
  getPreset: (name: string) => ThemePreset | undefined;
  getAllPresets: () => Record<string, ThemePreset>;
}

export const useThemePresetStore = create<ThemePresetStore>()((_set, get) => ({
  presets: defaultPresets,
  getPreset: (name: string) => {
    return get().presets[name];
  },
  getAllPresets: () => {
    return get().presets;
  },
}));
