
import {
  BrainCircuitIcon,
  SparklesIcon,
  CheckIcon,
  PaletteIcon,
  FileTextIcon,
  CodeIcon,
  ImageIcon,
  GlobeIcon,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useChatSettings } from "./chat-settings-menu";
import { AnimatePresence, motion } from "motion/react";

const chatModels = [
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    desc: "Fast & capable",
    tag: "new" as const,
  },
  { id: "gpt-5-mini", name: "GPT-5 Mini", desc: "Balanced performance" },
  { id: "gpt-4.1", name: "GPT-4.1", desc: "Most capable model" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", desc: "Efficient & quick" },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", desc: "Fastest responses" },
];

type SkillStatus = "discoverable" | "preload";

interface Skill {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  status: SkillStatus;
}

const defaultSkills: Skill[] = [
  {
    id: "frontend-design",
    name: "Frontend Design",
    desc: "Build polished web interfaces",
    icon: <PaletteIcon className="size-3.5" />,
    status: "preload",
  },
  {
    id: "pdf",
    name: "PDF Processing",
    desc: "Read, merge & manipulate PDFs",
    icon: <FileTextIcon className="size-3.5" />,
    status: "discoverable",
  },
  {
    id: "code-interpreter",
    name: "Code Interpreter",
    desc: "Generate code and charts",
    icon: <CodeIcon className="size-3.5" />,
    status: "discoverable",
  },
  {
    id: "image-gen",
    name: "Image Generation",
    desc: "Generate and edit images",
    icon: <ImageIcon className="size-3.5" />,
    status: "discoverable",
  },
  {
    id: "web-search",
    name: "Web Search",
    desc: "Search the web for info",
    icon: <GlobeIcon className="size-3.5" />,
    status: "discoverable",
  },
];

export function ChatSettingsPanel() {
  const { open, subView, setSubView, setOpen } = useChatSettings();
  const [selectedModel, setSelectedModel] = useState("gpt-5.4-mini");
  const [skills, setSkills] = useState<Skill[]>(defaultSkills);
  const panelRef = useRef<HTMLDivElement>(null);

  const toggleSkillStatus = useCallback((id: string) => {
    setSkills((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status:
                s.status === "preload"
                  ? ("discoverable" as SkillStatus)
                  : ("preload" as SkillStatus),
            }
          : s,
      ),
    );
  }, []);

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

  const currentModel = chatModels.find((m) => m.id === selectedModel);

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
          <div
            className={cn(
              "flex rounded-lg overflow-hidden w-fit border border-border/30 backdrop-blur-sm bg-background/70 shadow-sm",

            )}
          >
            { }
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
                detail={currentModel?.name?.replace("GPT-", "")}
                onClick={() => setSubView(subView === "model" ? null : "model")}
              />
              <NavButton
                icon={<SparklesIcon className="size-3.5" />}
                label="Skills"
                active={subView === "skills"}
                detail={`${skills.filter((s) => s.status === "preload").length}`}
                onClick={() =>
                  setSubView(subView === "skills" ? null : "skills")
                }
              />
            </nav>

            { }
            <AnimatePresence mode="wait">
              {subView && (
                <motion.div
                  key={subView}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="w-72 max-h-56 overflow-y-auto"
                >
                  {subView === "model" && (
                    <ModelList
                      models={chatModels}
                      selected={selectedModel}
                      onSelect={setSelectedModel}
                    />
                  )}
                  {subView === "skills" && (
                    <SkillList skills={skills} onToggle={toggleSkillStatus} />
                  )}
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
        <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
          {detail}
        </span>
      )}
    </button>
  );
}

function ModelList({
  models,
  selected,
  onSelect,
}: {
  models: typeof chatModels;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
          Chat Model
        </span>
      </div>
      {models.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onSelect(m.id)}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-left transition-colors",
            selected === m.id ? "bg-accent/40" : "hover:bg-accent/20",
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-foreground">
                {m.name}
              </span>
              {"tag" in m && m.tag && (
                <span className="text-[9px] font-bold uppercase px-1 py-px rounded bg-secondary text-primary leading-tight">
                  {m.tag}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground/60">
              {m.desc}
            </span>
          </div>
          <div
            className={cn(
              "size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
              selected === m.id
                ? "border-primary bg-primary"
                : "border-border/60",
            )}
          >
            {selected === m.id && <CheckIcon className="size-2.5 text-white" />}
          </div>
        </button>
      ))}
    </div>
  );
}

function SkillList({
  skills,
  onToggle,
}: {
  skills: Skill[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="py-1">
      <div className="px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40">
          Skills
        </span>
      </div>
      {skills.map((skill) => {
        const active = skill.status === "preload";
        return (
          <button
            key={skill.id}
            type="button"
            onClick={() => onToggle(skill.id)}
            className="flex items-center gap-3 w-full px-3 py-2 text-left transition-colors hover:bg-accent/20"
          >
            <div
              className={cn(
                "flex items-center justify-center size-7 rounded-lg shrink-0 transition-colors",
                active
                  ? "bg-secondary text-primary"
                  : "bg-muted/50 text-muted-foreground/50",
              )}
            >
              {skill.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[13px] font-medium text-foreground block">
                {skill.name}
              </span>
              <span className="text-[11px] text-muted-foreground/50">
                {skill.desc}
              </span>
            </div>
            <div
              className={cn(
                "size-4 mx-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                active ? "border-primary bg-primary" : "border-border/60",
              )}
            >
              {active && <CheckIcon className="size-2.5 text-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
