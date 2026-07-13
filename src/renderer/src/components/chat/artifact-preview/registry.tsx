import type { ArtifactKind } from "@shared/types";
import type { PreviewRenderer } from "./types";
import { SpreadsheetPreview } from "./spreadsheet-preview";
import { ImagePreview } from "./image-preview";
import { TextPreview } from "./text-preview";
import { PptxPreview } from "./pptx-preview";

/**
 * Maps each previewable {@link ArtifactKind} to the component that renders it
 * in the inspect sidebar. This is the single place to wire up new file types:
 * add a renderer module and register it here — the artifact card, the
 * "Preview" affordance, and {@link isPreviewable} all derive from this table.
 */
export const PREVIEW_RENDERERS: Partial<Record<ArtifactKind, PreviewRenderer>> = {
  excel: SpreadsheetPreview,
  csv: SpreadsheetPreview,
  image: ImagePreview,
  text: TextPreview,
  powerpoint: PptxPreview,
};

/** The renderer for a kind, or `null` when the file type has no inline preview. */
export function getPreviewRenderer(kind: ArtifactKind): PreviewRenderer | null {
  return PREVIEW_RENDERERS[kind] ?? null;
}

/** Whether a file type can be previewed inline (drives the Preview button). */
export function isPreviewable(kind: ArtifactKind): boolean {
  return getPreviewRenderer(kind) !== null;
}
