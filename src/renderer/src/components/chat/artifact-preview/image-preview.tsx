import type { PreviewProps } from "./types";

/** Renders raster/vector images inline, letterboxed inside the panel. */
export function ImagePreview({ artifact, dataBase64 }: PreviewProps) {
  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <img
        src={`data:${artifact.mediaType};base64,${dataBase64}`}
        alt={artifact.name}
        className="max-h-full max-w-full rounded-lg"
      />
    </div>
  );
}
