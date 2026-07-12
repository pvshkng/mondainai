
import { createContext, useContext, useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";
import { applyThemeToElement } from "@/utils/apply-theme";

type Mode = "dark" | "light";
type Coords = { x: number; y: number };

type ThemeProviderState = {
  theme: Mode;
  setTheme: (theme: Mode) => void;
  toggleTheme: (coords?: Coords) => void;
};

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
  toggleTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeState, setThemeState } = useEditorStore();

  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;
    applyThemeToElement(themeState, root);
  }, [themeState]);

  const handleThemeChange = (newMode: Mode) => {
    setThemeState({ ...themeState, currentMode: newMode });
  };

  const handleThemeToggle = (coords?: Coords) => {
    const root = document.documentElement;
    const newMode = themeState.currentMode === "light" ? "dark" : "light";
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || prefersReducedMotion) {
      handleThemeChange(newMode);
      return;
    }

    if (coords) {
      root.style.setProperty("--x", `${coords.x}px`);
      root.style.setProperty("--y", `${coords.y}px`);
    }

    document.startViewTransition(() => {
      handleThemeChange(newMode);
    });
  };

  return (
    <ThemeProviderContext.Provider
      value={{
        theme: themeState.currentMode,
        setTheme: handleThemeChange,
        toggleTheme: handleThemeToggle,
      }}
    >
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
