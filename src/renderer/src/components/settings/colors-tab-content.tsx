
import { useMemo, useState } from "react";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeStyleProps } from "@/types/theme";

type ColorEntry = {
  key: keyof ThemeStyleProps;
  label: string;
};

type ColorGroup = {
  title: string;
  defaultExpanded?: boolean;
  colors: ColorEntry[];
};

const COLOR_GROUPS: ColorGroup[] = [
  {
    title: "Primary",
    defaultExpanded: true,
    colors: [
      { key: "primary", label: "Background" },
      { key: "primary-foreground", label: "Foreground" },
    ],
  },
  {
    title: "Secondary",
    defaultExpanded: true,
    colors: [
      { key: "secondary", label: "Background" },
      { key: "secondary-foreground", label: "Foreground" },
    ],
  },
  {
    title: "Accent",
    colors: [
      { key: "accent", label: "Background" },
      { key: "accent-foreground", label: "Foreground" },
    ],
  },
  {
    title: "Base",
    colors: [
      { key: "background", label: "Background" },
      { key: "foreground", label: "Foreground" },
    ],
  },
  {
    title: "Card",
    colors: [
      { key: "card", label: "Background" },
      { key: "card-foreground", label: "Foreground" },
    ],
  },
  {
    title: "Muted",
    colors: [
      { key: "muted", label: "Background" },
      { key: "muted-foreground", label: "Foreground" },
    ],
  },
  {
    title: "Destructive",
    colors: [
      { key: "destructive", label: "Background" },
      { key: "destructive-foreground", label: "Foreground" },
    ],
  },
  {
    title: "Border & Input",
    colors: [
      { key: "border", label: "Border" },
      { key: "input", label: "Input" },
      { key: "ring", label: "Ring" },
    ],
  },
];

interface ColorRowProps {
  colorKey: keyof ThemeStyleProps;
  label: string;
  value: string;
  onChange: (key: keyof ThemeStyleProps, value: string) => void;
}

function ColorRow({ colorKey, label, value, onChange }: ColorRowProps) {
  const [inputVal, setInputVal] = useState(value);
  const [lastCommitted, setLastCommitted] = useState(value);

  const displayVal = lastCommitted !== value ? value : inputVal;

  return (
    <div className="group -mx-1 flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-muted/50">
      <div
        className="relative flex size-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border shadow-sm"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value.startsWith("#") ? value : "#000000"}
          onChange={(e) => onChange(colorKey, e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <span className="w-20 shrink-0 text-[10px] font-medium text-foreground">
        {label}
      </span>
      <input
        type="text"
        value={displayVal}
        onChange={(e) => {
          setInputVal(e.target.value);
          if (e.target.value.length >= 4) {
            setLastCommitted(e.target.value);
            onChange(colorKey, e.target.value);
          }
        }}
        className="h-7 w-full min-w-0 flex-1 rounded border bg-muted/50 px-2 font-mono text-xs text-muted-foreground outline-none transition-colors focus:border-ring focus:text-foreground"
        placeholder="#hex or oklch"
      />
    </div>
  );
}

interface ColorGroupSectionProps {
  group: ColorGroup;
  forceExpanded?: boolean;
  currentStyles: ThemeStyleProps;
  updateStyle: <K extends keyof ThemeStyleProps>(
    key: K,
    value: ThemeStyleProps[K],
  ) => void;
}

function ColorGroupSection({
  group,
  forceExpanded,
  currentStyles,
  updateStyle,
}: ColorGroupSectionProps) {
  const [expanded, setExpanded] = useState(group.defaultExpanded ?? false);
  const isExpanded = forceExpanded ?? expanded;

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        {group.title}
        {isExpanded ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
      </button>
      {isExpanded && (
        <div className="space-y-0.5">
          {group.colors.map((color) => (
            <ColorRow
              key={color.key}
              colorKey={color.key}
              label={color.label}
              value={(currentStyles[color.key] as string) ?? ""}
              onChange={(k, v) =>
                updateStyle(k, v as ThemeStyleProps[typeof k])
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ColorsTabContentProps {
  currentStyles: ThemeStyleProps;
  updateStyle: <K extends keyof ThemeStyleProps>(
    key: K,
    value: ThemeStyleProps[K],
  ) => void;
  updateStyles: (updates: Partial<ThemeStyleProps>) => void;
}

export function ColorsTabContent({
  currentStyles,
  updateStyle,
}: ColorsTabContentProps) {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return COLOR_GROUPS;
    const q = search.toLowerCase();
    return COLOR_GROUPS.map((g) => ({
      ...g,
      colors: g.colors.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          g.title.toLowerCase().includes(q),
      ),
    })).filter((g) => g.colors.length > 0);
  }, [search]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-2 pt-1">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search colors..."
            className="h-7 min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-4">
        {filteredGroups.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No colors found
          </p>
        )}
        {filteredGroups.map((group) => (
          <ColorGroupSection
            key={group.title}
            group={group}
            forceExpanded={search.trim() ? true : undefined}
            currentStyles={currentStyles}
            updateStyle={updateStyle}
          />
        ))}
      </ScrollArea>
    </div>
  );
}
