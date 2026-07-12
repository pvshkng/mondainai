import { defaultThemeState } from "@/config/theme";
import { ThemeStyles } from "@/types/theme";
import { useThemePresetStore } from "@/store/theme-preset-store";

function mergePresetWithDefaults(presetStyles: {
  light?: Partial<ThemeStyles["light"]>;
  dark?: Partial<ThemeStyles["dark"]>;
}): ThemeStyles {
  const defaultTheme = defaultThemeState.styles;
  return {
    light: {
      ...defaultTheme.light,
      ...(presetStyles.light || {}),
    },
    dark: {
      ...defaultTheme.dark,
      ...(presetStyles.light || {}),
      ...(presetStyles.dark || {}),
    },
  };
}

export function getPresetThemeStyles(name: string): ThemeStyles {
  if (name === "default") {
    return defaultThemeState.styles;
  }
  const store = useThemePresetStore.getState();
  const preset = store.getPreset(name);
  if (!preset) {
    return defaultThemeState.styles;
  }
  return mergePresetWithDefaults(preset.styles);
}
