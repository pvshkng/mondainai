
import { BrainCircuitIcon, CheckIcon, SettingsIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useChatSettings } from "./chat-settings-menu";
import { AnimatePresence, motion } from "motion/react";
import type { ConfiguredModel } from "@shared/provider-types";
import { useModelStore } from "@/store/model-store";
import { useSettingsModalStore } from "@/store/settings-modal-store";

export function ChatSettingsPanel() {
  const { open, subView, setSubView, setOpen } = useChatSettings();
  const [models, setModels] = useState<ConfiguredModel[]>([]);
  const providerId = useModelStore((s) => s.providerId);
  const modelId = useModelStore((s) => s.modelId);
  const setSelection = useModelStore((s) => s.setSelection);
  const openSettings = useSettingsModalStore((s) => s.openSection);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    window.api.providers.models().then((list) => {
      setModels(list);
      if (list.length > 0) {
        const current = list.find(
          (m) => m.providerId === providerId && m.modelId === modelId,
        );
        if (!current) {
          setSelection(list[0].providerId, list[0].modelId);
        }
      }
    });
  }, [open, providerId, modelId, setSelection]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (subView) setSubView(null);
        else setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, subView, setSubView, setOpen]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest("[data-settings-trigger]")) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setOpen(false);
        setSubView(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, setOpen, setSubView]);

  const currentModel = models.find(
    (m) => m.providerId === providerId && m.modelId === modelId,
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="mb-2"
        >
          <div className="flex rounded-lg overflow-hidden w-fit border border-border/30 backdrop-blur-sm bg-background/70 shadow-sm">
            <nav
              className={cn(
                "flex flex-col w-40 shrink-0 py-1",
                subView && "border-r border-border/20",
              )}
            >
              <NavButton
                icon={<BrainCircuitIcon className="size-3.5" />}
                label="Model"
                active={subView === "model"}
                detail={currentModel?.label}
                onClick={() => setSubView(subView === "model" ? null : "model")}
              />
            </nav>

            <AnimatePresence mode="wait">
              {subView === "model" && (
                <motion.div
                  key="model"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="w-72 max-h-56 overflow-y-auto"
                >
                  <ModelList
                    models={models}
                    selectedProviderId={providerId}
                    selectedModelId={modelId}
                    onSelect={setSelection}
                    onOpenSettings={() => {
                      setOpen(false);
                      setSubView(null);
                      openSettings("providers");
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function NavButton({
  icon,
  label,
  active,
  detail,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-[13px] w-full text-left transition-colors",
        active
          ? "bg-accent/50 text-foreground"
          : "text-muted-foreground hover:bg-accent/25 hover:text-foreground",
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
      {detail && (
        <span className="ml-auto max-w-24 truncate text-[10px] text-muted-foreground/50">
          {detail}
        </span>
      )}
    </button>
  );
}

function ModelList({
  models,
  selectedProviderId,
  selectedModelId,
  onSelect,
  onOpenSettings,
}: {
  models: ConfiguredModel[];
  selectedProviderId: string | null;
  selectedModelId: string | null;
  onSelect: (providerId: ConfiguredModel["providerId"], modelId: string) => void;
  onOpenSettings: () => void;
}) {
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 px-3 py-3">
        <span className="text-[12px] text-muted-foreground">
          No providers configured yet.
        </span>
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary/90 px-2 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-85"
        >
          <SettingsIcon className="size-3" />
          Open Provider Settings
        </button>
      </div>
    );
  }

  const grouped = new Map<string, ConfiguredModel[]>();
  for (const model of models) {
    const list = grouped.get(model.providerLabel) ?? [];
    list.push(model);
    grouped.set(model.providerLabel, list);
  }

  return (
    <div className="py-1">
      {[...grouped.entries()].map(([providerLabel, providerModels]) => (
        <div key={providerLabel}>
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
              {providerLabel}
            </span>
          </div>
          {providerModels.map((m) => {
            const isSelected =
              m.providerId === selectedProviderId && m.modelId === selectedModelId;
            return (
              <button
                key={`${m.providerId}:${m.modelId}`}
                type="button"
                onClick={() => onSelect(m.providerId, m.modelId)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 text-left transition-colors",
                  isSelected ? "bg-accent/40" : "hover:bg-accent/20",
                )}
              >
                <div className="flex-1 min-w-0">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {m.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground/60">
                    {m.modelId}
                  </span>
                </div>
                <div
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "border-primary bg-primary" : "border-border/60",
                  )}
                >
                  {isSelected && <CheckIcon className="size-2.5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
