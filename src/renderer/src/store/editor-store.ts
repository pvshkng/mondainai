import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ThemeEditorState } from "@/types/editor";
import { defaultThemeState } from "@/config/theme";
import { getPresetThemeStyles } from "@/utils/theme-preset-helper";

function isDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

const MAX_HISTORY_COUNT = 30;
const HISTORY_OVERRIDE_THRESHOLD_MS = 500;

interface ThemeHistoryEntry {
  state: ThemeEditorState;
  timestamp: number;
}

interface EditorStore {
  themeState: ThemeEditorState;
  history: ThemeHistoryEntry[];
  future: ThemeHistoryEntry[];
  setThemeState: (state: ThemeEditorState) => void;
  applyThemePreset: (preset: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      themeState: defaultThemeState,
      history: [],
      future: [],
      setThemeState: (newState: ThemeEditorState) => {
        const oldThemeState = get().themeState;
        let currentHistory = get().history;
        let currentFuture = get().future;

        const oldWithoutMode = { ...oldThemeState, currentMode: undefined };
        const newWithoutMode = { ...newState, currentMode: undefined };

        if (
          isDeepEqual(oldWithoutMode, newWithoutMode) &&
          oldThemeState.currentMode !== newState.currentMode
        ) {
          set({ themeState: newState });
          return;
        }

        const currentTime = Date.now();
        const lastEntry =
          currentHistory.length > 0
            ? currentHistory[currentHistory.length - 1]
            : null;

        if (
          !lastEntry ||
          currentTime - lastEntry.timestamp >= HISTORY_OVERRIDE_THRESHOLD_MS
        ) {
          currentHistory = [
            ...currentHistory,
            { state: oldThemeState, timestamp: currentTime },
          ];
          currentFuture = [];
        }

        if (currentHistory.length > MAX_HISTORY_COUNT) {
          currentHistory.shift();
        }

        set({
          themeState: newState,
          history: currentHistory,
          future: currentFuture,
        });
      },
      applyThemePreset: (preset: string) => {
        const currentThemeState = get().themeState;
        const oldHistory = get().history;
        const currentTime = Date.now();
        const newStyles = getPresetThemeStyles(preset);
        const newThemeState: ThemeEditorState = {
          ...currentThemeState,
          preset,
          styles: newStyles,
          hslAdjustments: defaultThemeState.hslAdjustments,
        };
        const newHistoryEntry = {
          state: currentThemeState,
          timestamp: currentTime,
        };
        const updatedHistory = [...oldHistory, newHistoryEntry];
        if (updatedHistory.length > MAX_HISTORY_COUNT) updatedHistory.shift();
        set({ themeState: newThemeState, history: updatedHistory, future: [] });
      },
      undo: () => {
        const history = get().history;
        if (history.length === 0) return;
        const currentThemeState = get().themeState;
        const future = get().future;
        const lastEntry = history[history.length - 1];
        set({
          themeState: {
            ...lastEntry.state,
            currentMode: currentThemeState.currentMode,
          },
          history: history.slice(0, -1),
          future: [
            { state: currentThemeState, timestamp: Date.now() },
            ...future,
          ],
        });
      },
      redo: () => {
        const future = get().future;
        if (future.length === 0) return;
        const history = get().history;
        const currentThemeState = get().themeState;
        const firstEntry = future[0];
        const updatedHistory = [
          ...history,
          { state: currentThemeState, timestamp: Date.now() },
        ];
        if (updatedHistory.length > MAX_HISTORY_COUNT) updatedHistory.shift();
        set({
          themeState: {
            ...firstEntry.state,
            currentMode: currentThemeState.currentMode,
          },
          history: updatedHistory,
          future: future.slice(1),
        });
      },
      canUndo: () => get().history.length > 0,
      canRedo: () => get().future.length > 0,
    }),
    { name: "chatbot-theme-storage" },
  ),
);
