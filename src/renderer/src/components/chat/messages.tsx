import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowDownIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Greeting } from "./greeting";

function MessagesSkeleton() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-2 py-6 md:px-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="size-7 shrink-0 animate-pulse rounded-lg bg-muted" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { PreviewMessage, ThinkingMessage } from "./message";

type MessagesProps = {
  chatId: string;
  inputHeight: number;
  isNewChat: boolean;
  status: UseChatHelpers<ChatMessage>["status"];
  messages: ChatMessage[];
  isReadonly: boolean;
  isChatLoading?: boolean;
  onEditMessageAction?: (message: ChatMessage) => void;
};

export function Messages({
  chatId,
  inputHeight,
  isNewChat,
  status,
  messages,
  isReadonly,
  isChatLoading,
  onEditMessageAction: onEditMessage,
}: MessagesProps) {
  const { containerRef, showButton, scrollToBottom, reset } = useChatScroll({
    status,
    messages,
    inputHeight,
  });

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      reset();
    }
  }, [chatId, reset]);

  return (
    <div className="relative flex-1 bg-background">
      {messages.length === 0 && isNewChat && !isChatLoading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Greeting />
        </div>
      )}
      {messages.length === 0 && !isNewChat && <MessagesSkeleton />}
      <div
        className={cn(
          "absolute inset-0 touch-pan-y overflow-y-auto",
          messages.length > 0 ? "bg-background" : "bg-transparent",
        )}
        ref={containerRef}
      >
        <div className="mx-auto flex min-h-full min-w-0 max-w-4xl flex-col gap-5 px-2 py-6 md:gap-7 md:px-4">
          {messages.map((message, index) => (
            <PreviewMessage
              key={message.id}
              chatId={chatId}
              isLoading={
                status === "streaming" && messages.length - 1 === index
              }
              isReadonly={isReadonly}
              message={message}
              onEdit={onEditMessage}
              vote={undefined}
            />
          ))}
          {status === "submitted" && messages.at(-1)?.role !== "assistant" && (
            <ThinkingMessage />
          )}
          { }
          <div className="shrink-0" style={{ height: inputHeight }} />
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll to bottom"
        className={`absolute left-1/2 z-20 flex -translate-x-1/2 items-center rounded-full border border-border/50 bg-card/90 px-3.5 shadow-sm backdrop-blur-lg transition-all duration-200 h-7 text-[10px] ${showButton ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0"}`}
        style={{ bottom: inputHeight + 20 }}
        onClick={() => scrollToBottom("smooth")}
      >
        <ArrowDownIcon className="size-3 text-muted-foreground" />
      </button>
    </div>
  );
}
