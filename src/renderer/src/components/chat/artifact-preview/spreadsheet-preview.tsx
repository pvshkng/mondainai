import { useMemo, useState } from "react";
import { read, utils, type WorkBook } from "xlsx";
import { cn } from "@/lib/utils";
import type { PreviewProps } from "./types";

type Cell = string | number | boolean | null | undefined;
const MAX_PREVIEW_ROWS = 200;
const MAX_PREVIEW_COLS = 40;

/** Renders .xlsx / .csv workbooks as a scrollable table with sheet tabs. */
export function SpreadsheetPreview({ dataBase64 }: PreviewProps) {
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
