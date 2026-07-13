import { useEffect, useRef, useState } from "react";
import { init } from "pptx-preview";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./types";
import { base64ToArrayBuffer } from "./utils";

// 16:9 is the modern PowerPoint default; used to size the render height from
// the available panel width.
const SLIDE_ASPECT = 9 / 16;

/** Renders .pptx presentations as a vertical, scrollable list of slides. */
export function PptxPreview({ dataBase64 }: PreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    setStatus("loading");
    setError(null);
    host.innerHTML = "";

    const width = host.clientWidth || 960;
    const previewer = init(host, {
      width,
      height: Math.round(width * SLIDE_ASPECT),
      mode: "list",
    });

    previewer
      .preview(base64ToArrayBuffer(dataBase64))
      .then(() => {
        if (!disposed) setStatus("ready");
      })
      .catch((err: Error) => {
        if (disposed) return;
        setError(err.message);
        setStatus("error");
      });

    return () => {
      disposed = true;
      try {
        previewer.destroy();
      } catch {
        // previewer may not have finished initializing; nothing to clean up
      }
      host.innerHTML = "";
    };
  }, [dataBase64]);

  return (
    <div className="relative h-full overflow-auto bg-muted/20">
      {status === "loading" && (
        <p className="p-4 text-[11px] text-muted-foreground">Rendering slides…</p>
      )}
      {status === "error" && (
        <p className="p-4 text-[11px] text-destructive">
          Could not render presentation: {error}
        </p>
      )}
      <div
        ref={hostRef}
        className={cn(
          "mx-auto w-full",
          status !== "ready" && "invisible h-0 overflow-hidden",
        )}
      />
    </div>
  );
}
