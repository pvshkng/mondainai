import type { UseChatHelpers } from "@ai-sdk/react";
import { ArrowUpIcon, PaperclipIcon } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useRouter } from "@/lib/navigation";
import { useActiveChat } from "@/hooks/use-active-chat";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../ai-elements/prompt-input";
import { Button } from "../ui/button";
import { StopIcon } from "./icons";
import { ChatSettingsTrigger } from "./chat-settings-menu";

function PureMultimodalInput({
  ref,
  chatId,
  input,
  setInput,
  status,
  stop,
  sendMessage,
}: {
  ref?: React.Ref<HTMLDivElement>;
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  messages: ChatMessage[];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  isChatLoading?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const { onBeforeFirstSend } = useActiveChat();
  const router = useRouter();

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const submitForm = useCallback(() => {
    if (!input.trim()) return;
    if (isSubmittingRef.current) return;

    isSubmittingRef.current = true;

    onBeforeFirstSend(chatId);
    router.push(`/chat/${chatId}`);
    sendMessage({ role: "user", parts: [{ type: "text", text: input }] });
    setInput("");
    setAttachedFiles([]);
    textareaRef.current?.focus();
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 300);
  }, [input, setInput, sendMessage, chatId, onBeforeFirstSend]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        setAttachedFiles((prev) => [...prev, ...files]);
      }
      e.target.value = "";
    },
    [],
  );

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div ref={ref} className="relative flex w-full flex-col gap-4">
      <PromptInput
        className="[&>div]:rounded-2xl [&>div]:border [&>div]:border-border/30 [&>div]:bg-background/70 [&>div]:backdrop-blur-xs [&>div]:shadow-sm"
        onSubmit={() => {
          if (!input.trim()) return;
          if (status === "ready" || status === "error") {
            submitForm();
          }
        }}
      >
        { }
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {attachedFiles.map((file, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                <PaperclipIcon className="size-3 shrink-0" />
                <span className="max-w-40 truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label="Remove attachment"
                  className="ml-0.5 hover:text-foreground"
                  onClick={() => removeFile(i)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <PromptInputTextarea
          className="min-h-10  max-h-40 text-base! leading-relaxed px-4 pt-3 pb-1.5 placeholder:text-muted-foreground/35"
          onChange={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && (status === "ready" || status === "error")) {
                submitForm();
              }
            }
          }}
          placeholder="Ask anything..."
          ref={textareaRef}
          value={input}
        />
        <PromptInputFooter className="px-3 pb-3">
          <PromptInputTools>
            <ChatSettingsTrigger />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Attach file"
              className="h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon className="size-4" />
            </Button>
          </PromptInputTools>

          <div className="flex items-center gap-1.5">
            {isStreaming ? (
              <Button
                className="h-7 w-7 rounded-xl bg-foreground p-1 text-background transition-all duration-200 hover:opacity-85"
                onClick={(e) => {
                  e.preventDefault();
                  stop();
                }}
              >
                <StopIcon size={14} />
              </Button>
            ) : (
              <PromptInputSubmit
                className={cn(
                  "h-7 w-7 rounded-xl transition-all duration-200",
                  input.trim()
                    ? "bg-primary/90 text-background hover:opacity-85 active:scale-95"
                    : "bg-muted text-muted-foreground/25 cursor-not-allowed",
                )}
                disabled={!input.trim()}
                status={status}
              >
                <ArrowUpIcon className="size-4" />
              </PromptInputSubmit>
            )}
          </div>
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput, (prev, next) => {
  if (prev.input !== next.input) return false;
  if (prev.status !== next.status) return false;
  if (prev.isChatLoading !== next.isChatLoading) return false;
  if (prev.messages.length !== next.messages.length) return false;
  return true;
});
