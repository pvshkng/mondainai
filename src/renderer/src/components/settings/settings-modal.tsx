import { KeySquare, Puzzle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useSettingsModalStore,
  type SettingsSection,
} from "@/store/settings-modal-store";
import { ProvidersSection } from "./providers-section";
import { McpSection } from "./mcp-section";
import { SkillsSection } from "./skills-section";

const NAV: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
  { id: "providers", label: "Providers", icon: <KeySquare className="size-3.5" /> },
  { id: "mcp", label: "MCP", icon: <Puzzle className="size-3.5" /> },
  { id: "skills", label: "Skills", icon: <Sparkles className="size-3.5" /> },
];

export function SettingsModal() {
  const open = useSettingsModalStore((s) => s.open);
  const section = useSettingsModalStore((s) => s.section);
  const setOpen = useSettingsModalStore((s) => s.setOpen);
  const openSection = useSettingsModalStore((s) => s.openSection);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[34rem] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1">
          <nav className="flex w-40 shrink-0 flex-col gap-0.5 border-r border-border/40 bg-muted/20 p-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openSection(item.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
                  section === item.id
                    ? "bg-accent/60 text-foreground"
                    : "text-muted-foreground hover:bg-accent/25 hover:text-foreground",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
          <ScrollArea className="min-w-0 flex-1">
            {/* Extra top padding keeps section headers/actions clear of the
                dialog's floating close button in the top-right corner. */}
            <div className="p-4 pt-10">
              {section === "providers" && <ProvidersSection />}
              {section === "mcp" && <McpSection />}
              {section === "skills" && <SkillsSection />}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
