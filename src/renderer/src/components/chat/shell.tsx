import { useEffect, useRef, useState } from "react";
import { useActiveChat } from "@/hooks/use-active-chat";
import type { ChatMessage } from "@/lib/types";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsPanelNarrow } from "@/hooks/use-mobile";
import { useInspectPanel } from "@/hooks/use-inspect-panel";
import { InspectPanelContent } from "./inspect-panel";

import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { ChatSettingsProvider } from "./chat-settings-menu";
import { ChatSettingsPanel } from "./chat-settings-panel";
import { useInputHeight } from "@/hooks/use-chat-scroll";

export function ChatShell() {
  const {
    chatId,
    messages,
    sendMessage,
    status,
    stop,
    input,
    setInput,
    isReadonly,
    isChatLoading,
    isNewChat,
  } = useActiveChat();

  const isPanelNarrow = useIsPanelNarrow();
  const { isOpen: isPanelOpen, closePanel } = useInspectPanel();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      setEditingMessage(null);
      closePanel();
    }
  }, [chatId, closePanel]);

  const { inputRef, inputHeight } = useInputHeight();

  const chatContent = (
    <ChatSettingsProvider>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
        <div className="pointer-events-none absolute inset-0 z-20 md:hidden">
          <div className="pointer-events-auto absolute left-3 top-3">
            <SidebarTrigger className="size-8 rounded-lg border border-border/50 bg-background/80 text-foreground/60 shadow-sm backdrop-blur-md hover:bg-accent hover:text-foreground" />
          </div>
        </div>
        <Messages
          chatId={chatId}
          inputHeight={inputHeight}
          isNewChat={isNewChat}
          isChatLoading={isChatLoading}
          isReadonly={isReadonly}
          messages={messages}
          onEditMessageAction={(msg) => {
            const text = msg.parts
              ?.filter((p) => p.type === "text")
              .map((p) => (p as { text: string }).text)
              .join("");
            setInput(text ?? "");
            setEditingMessage(msg);
          }}
          status={status}
        />

        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
          <div className="pointer-events-auto mx-auto w-full max-w-4xl px-2 pb-3 md:px-4 md:pb-4">
            <ChatSettingsPanel />
            {!isReadonly && (
              <MultimodalInput
                ref={inputRef}
                chatId={chatId}
                input={input}
                isChatLoading={isChatLoading}
                messages={messages}
                sendMessage={
                  editingMessage
                    ? async () => {
                        setEditingMessage(null);
                        sendMessage({
                          role: "user",
                          parts: [{ type: "text", text: input }],
                        });
                        setInput("");
                      }
                    : sendMessage
                }
                setInput={setInput}
                status={status}
                stop={stop}
              />
            )}
          </div>
        </div>
      </div>
    </ChatSettingsProvider>
  );

  if (isPanelNarrow) {
    return (
      <div className="flex h-dvh w-full flex-col overflow-hidden">
        {chatContent}
        <InspectPanelContent />
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <div
        className="flex h-full min-w-0 flex-1 flex-col transition-[flex] duration-300 ease-in-out"
        style={{ flex: isPanelOpen ? "1 1 60%" : "1 1 100%" }}
      >
        {chatContent}
      </div>

      <div
        className="h-full overflow-hidden border-l border-border/40 transition-[width] duration-300 ease-in-out bg-primary-foreground"
        style={{ width: isPanelOpen ? "40%" : "0px" }}
      >
        {isPanelOpen && (
          <div className="h-full min-w-[320px]">
            <InspectPanelContent />
          </div>
        )}
      </div>
    </div>
  );
}
