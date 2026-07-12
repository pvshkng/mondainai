
import React from "react";
import { ChevronRight, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useEditorStore } from "@/store/editor-store";
import { defaultThemeState } from "@/config/theme";
import { COMMON_STYLES } from "@/config/theme";
import { ThemeStyles, ThemeStyleProps } from "@/types/theme";
import { ColorsTabContent } from "@/components/settings/colors-tab-content";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SidebarPresetList } from "./sidebar-preset-list";

interface SidebarThemeSettingsProps {
  onBack: () => void;
}

type ThemeSubView = "main" | "presets";

export function SidebarThemeSettings({ onBack }: SidebarThemeSettingsProps) {
  const { theme, toggleTheme } = useTheme();
  const themeState = useEditorStore((state) => state.themeState);
  const setThemeState = useEditorStore((state) => state.setThemeState);
  const [subView, setSubView] = React.useState<ThemeSubView>("main");

  const currentMode = themeState.currentMode;

  const currentStyles = React.useMemo(
    () => ({
      ...defaultThemeState.styles[currentMode],
      ...themeState.styles?.[currentMode],
    }),
    [currentMode, themeState.styles],
  );

  const handleStyleChange = React.useCallback(
    (newStyles: ThemeStyles) => {
      const prev = useEditorStore.getState().themeState;
      setThemeState({ ...prev, styles: newStyles });
    },
    [setThemeState],
  );

  const updateStyle = React.useCallback(
    <K extends keyof ThemeStyleProps>(key: K, value: ThemeStyleProps[K]) => {
      const styles = useEditorStore.getState().themeState.styles;
      if ((COMMON_STYLES as readonly string[]).includes(key as string)) {
        handleStyleChange({
          ...styles,
          light: { ...styles.light, [key]: value },
          dark: { ...styles.dark, [key]: value },
        });
        return;
      }
      handleStyleChange({
        ...styles,
        [currentMode]: {
          ...currentStyles,
          [key]: value,
        },
      });
    },
    [handleStyleChange, currentMode, currentStyles],
  );

  const updateStyles = React.useCallback(
    (updates: Partial<ThemeStyleProps>) => {
      const styles = useEditorStore.getState().themeState.styles;
      handleStyleChange({
        ...styles,
        [currentMode]: {
          ...currentStyles,
          ...updates,
        },
      });
    },
    [handleStyleChange, currentMode, currentStyles],
  );

  const radius = parseFloat(currentStyles.radius?.replace("rem", "") || "0.5");
  const letterSpacing = parseFloat(
    currentStyles["letter-spacing"]?.replace("em", "") || "0",
  );

  if (subView === "presets") {
    return <SidebarPresetList onBack={() => setSubView("main")} />;
  }

  return (
    <div
      className="flex flex-col"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      { }
      <div className="flex items-center justify-between border-b px-3 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className="size-3 rotate-180" />
          <span>Theme</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
          }}
        >
          {theme === "light" ? (
            <>
              <Sun className="size-3.5" />
              <span className="text-xs">Light</span>
            </>
          ) : (
            <>
              <Moon className="size-3.5" />
              <span className="text-xs">Dark</span>
            </>
          )}
        </Button>
      </div>

      { }
      <button
        onClick={() => setSubView("presets")}
        className="flex w-full items-center justify-between border-b px-3 py-2 transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex gap-0.5">
            {[
              themeState.styles[currentMode].primary,
              themeState.styles[currentMode].accent,
              themeState.styles[currentMode].secondary,
              themeState.styles[currentMode].border,
            ].map((color, i) => (
              <div
                key={i}
                className="size-2.5 rounded-sm border border-muted"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="truncate text-xs font-medium capitalize">
            {themeState.preset ?? "default"}
          </span>
        </div>
        <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
      </button>

      { }
      <Tabs defaultValue="colors" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mb-0.5 mt-1.5 w-auto justify-start rounded-full bg-muted/50 px-0.5">
          <TabsTrigger
            value="colors"
            className="rounded-full text-[11px] h-6 px-2.5"
          >
            Colors
          </TabsTrigger>
          <TabsTrigger
            value="other"
            className="rounded-full text-[11px] h-6 px-2.5"
          >
            Other
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="mt-0 flex-1 overflow-hidden">
          <div className="h-56">
            <ColorsTabContent
              currentStyles={currentStyles}
              updateStyle={updateStyle}
              updateStyles={updateStyles}
            />
          </div>
        </TabsContent>

        <TabsContent value="other" className="mt-0 flex-1 overflow-hidden">
          <ScrollArea className="h-56 px-3">
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Border Radius
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.025}
                    value={radius}
                    onChange={(e) =>
                      updateStyle("radius", `${e.target.value}rem`)
                    }
                    className="flex-1 accent-primary"
                  />
                  <span className="w-10 text-right font-mono text-[11px] text-muted-foreground">
                    {radius}rem
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Letter Spacing
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={-0.1}
                    max={0.2}
                    step={0.005}
                    value={letterSpacing}
                    onChange={(e) =>
                      updateStyle("letter-spacing", `${e.target.value}em`)
                    }
                    className="flex-1 accent-primary"
                  />
                  <span className="w-14 text-right font-mono text-[11px] text-muted-foreground">
                    {letterSpacing.toFixed(3)}em
                  </span>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
