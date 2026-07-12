import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { SaveSkillInput, SkillEntry } from "@shared/skill-types";

const EMPTY_FORM: SaveSkillInput = {
  name: "",
  description: "",
  content: "",
  active: true,
};

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

  if (!skills) {
    return <p className="text-xs text-muted-foreground">Loading skills...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-foreground">Skills</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Skills are reusable instructions added to the assistant when active.
            They are stored locally on this device.
          </p>
        </div>
        <Button type="button" size="sm" onClick={startAdd}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {skills.length === 0 && !showForm && (
          <p className="text-[11px] text-muted-foreground">No skills yet.</p>
        )}
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="flex w-full items-center gap-3 rounded-lg border border-border/40 bg-background/30 px-3 py-2"
          >
            <button
              type="button"
              onClick={() => startEdit(skill)}
              className="flex-1 min-w-0 text-left"
            >
              <span className="block truncate text-[13px] font-medium text-foreground">
                {skill.name || "(unnamed)"}
              </span>
              {skill.description && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {skill.description}
                </span>
              )}
            </button>
            <Switch checked={skill.active} onCheckedChange={() => toggleActive(skill)} />
          </div>
        ))}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-background/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">
              {editingId ? "Edit skill" : "Add skill"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Active</span>
              <Switch
                checked={form.active}
                onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
              />
            </div>
          </div>

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
            <label className="text-[11px] font-medium text-muted-foreground">Instructions</label>
            <Textarea
              rows={6}
              value={form.content}
              placeholder="Answer in at most three sentences unless asked for detail."
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleDelete(editingId)}
                >
                  Remove
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
            <Button type="button" size="sm" disabled={busy || !form.name.trim()} onClick={handleSave}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
