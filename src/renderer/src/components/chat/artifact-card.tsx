import { useEffect, useMemo, useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ImageIcon,
  PresentationIcon,
} from "lucide-react";
import { read, utils, type WorkBook } from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ArtifactInfo, ArtifactKind } from "@shared/types";

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

const PREVIEWABLE_KINDS: ArtifactKind[] = ["excel", "csv", "image", "text"];

function formatBytes(size: number): string {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${size} B`;
}

type Cell = string | number | boolean | null | undefined;
const MAX_PREVIEW_ROWS = 200;
const MAX_PREVIEW_COLS = 40;

function SpreadsheetPreview({ dataBase64 }: { dataBase64: string }) {
  const workbook: WorkBook = useMemo(
    () => read(dataBase64, { type: "base64" }),
    [dataBase64],
  );
  const [sheetName, setSheetName] = useState(workbook.SheetNames[0]);
  const activeSheet = workbook.SheetNames.includes(sheetName)
    ? sheetName
    : workbook.SheetNames[0];

  const rows: Cell[][] = useMemo(() => {
    const sheet = workbook.Sheets[activeSheet];
    if (!sheet) return [];
    const all = utils.sheet_to_json<Cell[]>(sheet, { header: 1, defval: "" });
    return all.slice(0, MAX_PREVIEW_ROWS + 1).map((r) => r.slice(0, MAX_PREVIEW_COLS));
  }, [workbook, activeSheet]);

  return (
    <div className="flex h-full flex-col">
      {workbook.SheetNames.length > 1 && (
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/40 bg-muted/20 px-2 py-1.5">
          {workbook.SheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setSheetName(name)}
              className={cn(
                "whitespace-nowrap rounded-md px-2 py-1 text-[11px]",
                name === activeSheet
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={cn(
                      "max-w-48 truncate border border-border/30 px-2 py-1",
                      i === 0
                        ? "bg-muted/40 font-medium text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {String(cell ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > MAX_PREVIEW_ROWS && (
          <p className="px-3 py-2 text-center text-[11px] text-muted-foreground">
            Preview truncated at {MAX_PREVIEW_ROWS} rows — save the file to see everything.
          </p>
        )}
      </div>
    </div>
  );
}

function decodeBase64Text(dataBase64: string): string {
  const bytes = Uint8Array.from(atob(dataBase64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function PreviewBody({
  artifact,
  dataBase64,
}: {
  artifact: ArtifactInfo;
  dataBase64: string;
}) {
  switch (artifact.kind) {
    case "excel":
    case "csv":
      return <SpreadsheetPreview dataBase64={dataBase64} />;
    case "image":
      return (
        <div className="flex h-full items-center justify-center overflow-auto p-4">
          <img
            src={`data:${artifact.mediaType};base64,${dataBase64}`}
            alt={artifact.name}
            className="max-h-full max-w-full rounded-lg"
          />
        </div>
      );
    case "text":
      return (
        <pre className="h-full overflow-auto p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {decodeBase64Text(dataBase64)}
        </pre>
      );
    default:
      return null;
  }
}

function ArtifactPreviewDialog({
  artifact,
  open,
  onOpenChange,
}: {
  artifact: ArtifactInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dataBase64, setDataBase64] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open, artifact.path]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{artifact.name}</DialogTitle>
        </DialogHeader>
        <div className="h-[60vh] max-h-[60vh] overflow-hidden rounded-lg border border-border/40">
          {error ? (
            <p className="p-4 text-[11px] text-destructive">
              Could not load preview: {error}
            </p>
          ) : dataBase64 == null ? (
            <p className="p-4 text-[11px] text-muted-foreground">Loading preview…</p>
          ) : (
            <PreviewBody artifact={artifact} dataBase64={dataBase64} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ArtifactCard({ artifact }: { artifact: ArtifactInfo }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const Icon = KIND_ICON[artifact.kind];

  const save = async () => {
    const destination = await window.api.sandbox.saveFileAs(artifact.path, artifact.name);
    if (destination) setSaved(destination);
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
          {PREVIEWABLE_KINDS.includes(artifact.kind) && (
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
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
      <ArtifactPreviewDialog artifact={artifact} open={open} onOpenChange={setOpen} />
    </div>
  );
}
