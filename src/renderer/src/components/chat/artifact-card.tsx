import { useEffect, useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  PresentationIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInspectPanel } from "@/hooks/use-inspect-panel";
import type { ArtifactInfo, ArtifactKind } from "@shared/types";
import { getPreviewRenderer, isPreviewable } from "./artifact-preview";

const KIND_ICON: Record<ArtifactKind, typeof FileTextIcon> = {
  excel: FileSpreadsheetIcon,
  csv: FileSpreadsheetIcon,
  powerpoint: PresentationIcon,
  word: FileTextIcon,
  pdf: FileTextIcon,
  image: ImageIcon,
  text: FileTextIcon,
  other: FileIcon,
};

const KIND_LABEL: Record<ArtifactKind, string> = {
  excel: "Excel workbook",
  csv: "CSV file",
  powerpoint: "PowerPoint presentation",
  word: "Word document",
  pdf: "PDF document",
  image: "Image",
  text: "Text file",
  other: "File",
};

function formatBytes(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

/** Fills the right inspect panel with an artifact preview + save action. */
function ArtifactPreviewPanel({ artifact }: { artifact: ArtifactInfo }) {
  const [dataBase64, setDataBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const Renderer = getPreviewRenderer(artifact.kind);

  useEffect(() => {
    let cancelled = false;
    setDataBase64(null);
    setError(null);
    window.api.sandbox
      .readFileBase64(artifact.path)
      .then((data) => {
        if (!cancelled) setDataBase64(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [artifact.path]);

  const save = async () => {
    const destination = await window.api.sandbox.saveFileAs(artifact.path, artifact.name);
    if (destination) setSaved(destination);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        {error ? (
          <p className="p-4 text-[11px] text-destructive">
            Could not load preview: {error}
          </p>
        ) : dataBase64 == null ? (
          <p className="p-4 text-[11px] text-muted-foreground">Loading preview…</p>
        ) : Renderer ? (
          <Renderer artifact={artifact} dataBase64={dataBase64} />
        ) : (
          <p className="p-4 text-[11px] text-muted-foreground">
            No inline preview for this file type — save it to open on your device.
          </p>
        )}
      </div>
      <div className="shrink-0 border-t border-border/40 px-4 py-3">
        <Button type="button" size="sm" className="w-full" onClick={save}>
          <DownloadIcon />
          Save to device
        </Button>
        {saved && (
          <p className="mt-2 truncate text-center text-[11px] text-muted-foreground">
            Saved to {saved}
          </p>
        )}
      </div>
    </div>
  );
}

export function ArtifactCard({ artifact }: { artifact: ArtifactInfo }) {
  const [saved, setSaved] = useState<string | null>(null);
  const { openPanel, panelId } = useInspectPanel();
  const Icon = KIND_ICON[artifact.kind];
  const previewId = `artifact:${artifact.path}`;
  const previewing = panelId === previewId;

  const save = async () => {
    const destination = await window.api.sandbox.saveFileAs(artifact.path, artifact.name);
    if (destination) setSaved(destination);
  };

  const preview = () => {
    openPanel(previewId, <ArtifactPreviewPanel artifact={artifact} />, artifact.name);
  };

  return (
    <div className="my-1">
      <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{artifact.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {KIND_LABEL[artifact.kind]} · {formatBytes(artifact.size)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {isPreviewable(artifact.kind) && (
            <Button
              type="button"
              size="sm"
              variant={previewing ? "secondary" : "outline"}
              onClick={preview}
            >
              Preview
            </Button>
          )}
          <Button type="button" size="sm" onClick={save}>
            <DownloadIcon />
            Save
          </Button>
        </div>
      </div>
      {saved && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">Saved to {saved}</p>
      )}
    </div>
  );
}
