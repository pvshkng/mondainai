
import { useMemo, useState } from "react";
import { Check, ChevronRight, Search, Shuffle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "@/store/editor-store";
import { useThemePresetStore } from "@/store/theme-preset-store";
import { getPresetThemeStyles } from "@/utils/theme-preset-helper";

function ColorBox({ color }: { color: string }) {
  return (
    <div
      className="size-2.5 rounded-sm border border-muted"
      style={{ backgroundColor: color }}
    />
  );
}

function ThemeColors({ presetName, mode }: { presetName: string; mode: "light" | "dark" }) {
  const styles = getPresetThemeStyles(presetName)[mode];
  return (
    <div className="flex gap-0.5">
      <ColorBox color={styles.primary} />
      <ColorBox color={styles.accent} />
      <ColorBox color={styles.secondary} />
      <ColorBox color={styles.border} />
    </div>
  );
}

interface SidebarPresetListProps {
  onBack: () => void;
}

export function SidebarPresetList({ onBack }: SidebarPresetListProps) {
  const themeState = useEditorStore((state) => state.themeState);
  const applyThemePreset = useEditorStore((state) => state.applyThemePreset);
  const presets = useThemePresetStore((state) => state.getAllPresets());
  const currentPreset = themeState.preset;
  const mode = themeState.currentMode;

  const [search, setSearch] = useState("");

  const presetNames = useMemo(() => ["default", ...Object.keys(presets)], [presets]);
  const currentPresetName = presetNames.find((name) => name === currentPreset) ?? "default";

  const filteredPresets = useMemo(() => {
    if (!search.trim()) return presetNames;
    const q = search.toLowerCase();
    return presetNames.filter((name) => {
      if (name === "default") return "default".includes(q);
      return presets[name]?.label?.toLowerCase().includes(q);
    });
  }, [presetNames, search, presets]);

  const randomize = () => {
    const random = Math.floor(Math.random() * presetNames.length);
    applyThemePreset(presetNames[random]);
  };

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
          <span>Presets</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2"
          onClick={randomize}
        >
          <Shuffle className="size-3" />
          <span className="text-xs">Random</span>
        </Button>
      </div>

      { }
      <div className="border-b px-3 py-1.5">
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-2">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search themes..."
            className="h-7 min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      { }
      <ScrollArea className="h-64">
        <div className="p-1">
          {filteredPresets.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">No themes found</p>
          )}
          {filteredPresets.map((presetName) => (
            <button
              key={presetName}
              onClick={() => applyThemePreset(presetName)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50 ${
                presetName === currentPresetName ? "bg-muted/40" : ""
              }`}
            >
              <ThemeColors presetName={presetName} mode={mode} />
              <span className="flex-1 truncate text-xs capitalize">
                {presets[presetName]?.label ?? presetName}
              </span>
              {presetName === currentPresetName && (
                <Check className="size-3 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
