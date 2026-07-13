import type { PreviewProps } from "./types";
import { decodeBase64Text } from "./utils";

/** Renders plain-text / code artifacts in a monospace, scrollable block. */
export function TextPreview({ dataBase64 }: PreviewProps) {
  return (
    <pre className="h-full overflow-auto p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
      {decodeBase64Text(dataBase64)}
    </pre>
  );
}
