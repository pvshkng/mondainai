
import { PlusIcon } from "lucide-react";
import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SubView = null | "model" | "skills";

interface ChatSettingsState {
  open: boolean;
  setOpen: (open: boolean) => void;
  subView: SubView;
  setSubView: (subView: SubView) => void;
}

const ChatSettingsContext = createContext<ChatSettingsState | null>(null);

export function useChatSettings() {
  const ctx = useContext(ChatSettingsContext);
  if (!ctx)
    throw new Error("useChatSettings must be used within ChatSettingsProvider");
  return ctx;
}

export function ChatSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [subView, setSubView] = useState<SubView>(null);

  return (
    <ChatSettingsContext.Provider
      value={{ open, setOpen, subView, setSubView }}
    >
      {children}
    </ChatSettingsContext.Provider>
  );
}

export function ChatSettingsTrigger() {
  const { open, setOpen, setSubView } = useChatSettings();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground"
      aria-label="Settings"
      data-settings-trigger
      onClick={() => {
        setOpen(!open);
        setSubView(null);
      }}
    >
      <PlusIcon
        className={cn(
          "size-4 transition-transform duration-200",
          open && "rotate-45",
        )}
      />
    </Button>
  );
}
