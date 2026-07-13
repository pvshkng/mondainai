import type { ArtifactInfo } from "@shared/types";

/** Props every artifact preview renderer receives. */
export interface PreviewProps {
  artifact: ArtifactInfo;
  /** Raw file contents, base64-encoded, already loaded from the sandbox. */
  dataBase64: string;
}

/**
 * A preview renderer turns a loaded artifact into a sidebar view. Register one
 * per {@link ArtifactKind} in `registry.tsx`; add new file types by writing a
 * renderer and listing it there — nothing else needs to change.
 */
export type PreviewRenderer = (props: PreviewProps) => React.JSX.Element | null;
