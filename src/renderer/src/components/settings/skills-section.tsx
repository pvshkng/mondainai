import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  FilePlus2,
  FileText,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SaveSkillInput, SkillEntry } from "@shared/skill-types";

const EMPTY_FORM: SaveSkillInput = {
  name: "",
  description: "",
  content: "",
  active: true,
};

/** A skill maps to a Markdown "file"; derive its display name from the title. */
function fileName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "untitled"}.md`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function SkillsSection() {
  const [skills, setSkills] = useState<SkillEntry[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SaveSkillInput>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    window.api.skills.list().then(setSkills);
  }, []);

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const startEdit = (skill: SkillEntry) => {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      description: skill.description,
      content: skill.content,
      active: skill.active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const updated = await window.api.skills.save(editingId, form);
      setSkills([...updated]);
      setShowForm(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      const updated = await window.api.skills.delete(id);
      setSkills([...updated]);
      if (editingId === id) setShowForm(false);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (skill: SkillEntry) => {
    const updated = await window.api.skills.save(skill.id, {
      name: skill.name,
      description: skill.description,
      content: skill.content,
      active: !skill.active,
    });
    setSkills([...updated]);
  };

  const currentSize = useMemo(
    () => new Blob([form.content ?? ""]).size,
    [form.content],
  );

  if (!skills) {
    return <p className="text-xs text-muted-foreground">Loading skills...</p>;
  }

  // ---- File editor view ---------------------------------------------------
  if (showForm) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" />
            Skills
          </button>
          <span className="text-muted-foreground/40">/</span>
          <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground">
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="font-mono">{fileName(form.name)}</span>
          </div>
          <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            {formatSize(currentSize)}
            <Switch
              checked={form.active}
              onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
            />
          </span>
        </div>

        <div className="space-y-3 rounded-lg border border-border/50 bg-background/40 p-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Name</label>
            <Input
              value={form.name}
              placeholder="Concise answers"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Description</label>
            <Input
              value={form.description}
              placeholder="Keep replies short and to the point"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Contents</label>
            <Textarea
              rows={9}
              value={form.content}
              className="font-mono text-[12px]"
              placeholder="Answer in at most three sentences unless asked for detail."
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {editingId ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => handleDelete(editingId)}
              >
                <Trash2 className="size-3" />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={busy || !form.name.trim()}
                onClick={handleSave}
              >
                {busy ? "Saving..." : "Save file"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- File list view -----------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-foreground">Skills</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Each skill is a Markdown file of reusable instructions added to the assistant
            when active. Files are stored locally on this device.
          </p>
        </div>
        <Button type="button" size="sm" onClick={startAdd}>
          <FilePlus2 className="size-3" />
          New file
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/40">
        <div className="flex items-center gap-3 border-b border-border/40 bg-muted/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <span className="flex-1">Name</span>
          <span className="w-16 text-right">Size</span>
          <span className="w-12 text-center">Active</span>
          <span className="w-6" />
        </div>

        {skills.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
            No skill files yet. Create one with “New file”.
          </div>
        ) : (
          skills.map((skill) => (
            <div
              key={skill.id}
              className="group flex items-center gap-3 border-b border-border/30 px-3 py-2 last:border-b-0 hover:bg-accent/20"
            >
              <button
                type="button"
                onClick={() => startEdit(skill)}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <FileText
                  className={cn(
                    "size-4 shrink-0",
                    skill.active ? "text-foreground/70" : "text-muted-foreground/40",
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[12px] text-foreground">
                    {fileName(skill.name)}
                  </span>
                  {skill.description && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {skill.description}
                    </span>
                  )}
                </span>
              </button>
              <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">
                {formatSize(new Blob([skill.content ?? ""]).size)}
              </span>
              <span className="flex w-12 justify-center">
                <Switch
                  checked={skill.active}
                  onCheckedChange={() => toggleActive(skill)}
                />
              </span>
              <button
                type="button"
                aria-label="Delete file"
                onClick={() => handleDelete(skill.id)}
                className="flex w-6 justify-center text-muted-foreground/50 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
