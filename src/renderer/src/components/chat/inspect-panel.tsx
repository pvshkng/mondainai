
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
  const { isOpen, content, closePanel } = useInspectPanel();
  const isPanelNarrow = useIsPanelNarrow();

  if (!isOpen || !content) return null;

  if (isPanelNarrow) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closePanel()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex flex-row items-center justify-between">
            <DrawerTitle>รายละเอียด</DrawerTitle>
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
          <div className="overflow-y-auto px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-medium">รายละเอียด</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={closePanel}
        >
          <XIcon className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{content}</div>
    </div>
  );
}
