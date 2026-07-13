
import { useIsPanelNarrow } from "@/hooks/use-mobile";
import { useInspectPanel } from "@/hooks/use-inspect-panel";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InspectPanelContent() {
  const { isOpen, content, title, closePanel } = useInspectPanel();
  const isPanelNarrow = useIsPanelNarrow();

  if (!isOpen || !content) return null;

  const heading = title ?? "รายละเอียด";

  if (isPanelNarrow) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closePanel()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle className="truncate">{heading}</DrawerTitle>
            <DrawerDescription className="sr-only">
              แบบฟอร์มรายละเอียด
            </DrawerDescription>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={closePanel}
            >
              <XIcon className="size-4" />
            </Button>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-hidden">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="truncate text-sm font-medium">{heading}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={closePanel}
        >
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{content}</div>
    </div>
  );
}
