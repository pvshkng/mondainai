import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type {
  McpServerSummary,
  McpTestResult,
  McpTransportType,
  SaveMcpServerInput,
} from "@shared/mcp-types";

const EMPTY_FORM: SaveMcpServerInput = {
  name: "",
  enabled: true,
  transportType: "stdio",
  command: "",
  args: "",
  url: "",
  env: "",
  headers: "",
};

export function McpSection() {
  const [servers, setServers] = useState<McpServerSummary[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SaveMcpServerInput>(EMPTY_FORM);
  const [busy, setBusy] = useState<"save" | "test" | "delete" | null>(null);
  const [testResult, setTestResult] = useState<McpTestResult | null>(null);

  useEffect(() => {
    window.api.mcp.list().then(setServers);
  }, []);

  const startAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTestResult(null);
    setShowForm(true);
  };

  const startEdit = (server: McpServerSummary) => {
    setEditingId(server.id);
    setForm({
      name: server.name,
      enabled: server.enabled,
      transportType: server.transportType,
      command: server.command,
      args: server.args,
      url: server.url,
      env: "",
      headers: "",
    });
    setTestResult(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    setBusy("save");
    try {
      const updated = await window.api.mcp.save(editingId, form);
      setServers(updated);
      setShowForm(false);
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    setBusy("test");
    setTestResult(null);
    try {
      setTestResult(await window.api.mcp.test(editingId, form));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy("delete");
    try {
      const updated = await window.api.mcp.delete(id);
      setServers(updated);
      if (editingId === id) setShowForm(false);
    } finally {
      setBusy(null);
    }
  };

  if (!servers) {
    return <p className="text-xs text-muted-foreground">Loading MCP servers...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-foreground">MCP Servers</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Connect Model Context Protocol servers to give the assistant extra tools.
            All server settings are stored locally on this device.
          </p>
        </div>
        <Button type="button" size="sm" onClick={startAdd}>
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {servers.length === 0 && !showForm && (
          <p className="text-[11px] text-muted-foreground">No MCP servers yet.</p>
        )}
        {servers.map((server) => (
          <button
            key={server.id}
            type="button"
            onClick={() => startEdit(server)}
            className="flex w-full items-center gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2 text-left transition-colors hover:bg-accent/20"
          >
            <span className="flex-1 min-w-0">
              <span className="block truncate text-[13px] font-medium text-foreground">
                {server.name || "(unnamed)"}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {server.transportType === "stdio"
                  ? `${server.command} ${server.args}`.trim()
                  : server.url}
              </span>
              {server.lastError && (
                <span className="block truncate text-[11px] text-destructive">
                  {server.lastError}
                </span>
              )}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                server.connected
                  ? "bg-emerald-500/15 text-emerald-500"
                  : server.enabled
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {server.connected
                ? `${server.toolNames.length} tools`
                : server.enabled
                  ? "Not connected"
                  : "Disabled"}
            </span>
          </button>
        ))}
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border border-border/50 bg-background/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-foreground">
              {editingId ? "Edit server" : "Add server"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Enabled</span>
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Name</label>
            <Input
              value={form.name}
              placeholder="My tool server"
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Transport</label>
            <div className="flex gap-1">
              {(["stdio", "http", "sse"] as McpTransportType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, transportType: t }))}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium uppercase transition-colors",
                    form.transportType === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {form.transportType === "stdio" ? (
            <>
              <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                A stdio server runs the command below as a local process on this
                machine every time the app connects. Only add commands you trust.
              </p>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Command</label>
                <Input
                  value={form.command}
                  placeholder="npx"
                  onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Arguments</label>
                <Input
                  value={form.args}
                  placeholder="-y @modelcontextprotocol/server-filesystem /tmp"
                  onChange={(e) => setForm((f) => ({ ...f, args: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Environment variables (KEY=value per line)
                </label>
                <Textarea
                  rows={3}
                  value={form.env}
                  placeholder={editingId ? "Leave blank to keep saved values" : "API_TOKEN=..."}
                  onChange={(e) => setForm((f) => ({ ...f, env: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">URL</label>
                <Input
                  value={form.url}
                  placeholder="https://example.com/mcp"
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Headers (KEY=value per line)
                </label>
                <Textarea
                  rows={3}
                  value={form.headers}
                  placeholder={
                    editingId ? "Leave blank to keep saved values" : "Authorization=Bearer ..."
                  }
                  onChange={(e) => setForm((f) => ({ ...f, headers: e.target.value }))}
                />
              </div>
            </>
          )}

          {testResult && (
            <p
              className={
                testResult.ok ? "text-[11px] text-emerald-500" : "text-[11px] text-destructive"
              }
            >
              {testResult.ok
                ? `Connected. Tools: ${testResult.tools.join(", ") || "(none)"}`
                : `Connection failed: ${testResult.error}`}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-2">
              {editingId && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => handleDelete(editingId)}
                >
                  Remove
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={handleTest}
              >
                {busy === "test" ? "Testing..." : "Test"}
              </Button>
              <Button type="button" size="sm" disabled={busy !== null} onClick={handleSave}>
                {busy === "save" ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
