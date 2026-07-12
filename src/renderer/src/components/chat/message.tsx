import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2Icon,
  ChevronRightIcon,
  LoaderIcon,
  WrenchIcon,
} from "lucide-react";
import { memo, useState, type ReactNode } from "react";
import React from "react";
import { MessageContent, MessageResponse } from "../ai-elements/message";
import { Shimmer } from "../ai-elements/shimmer";

import { MessageActions } from "./message-actions";
import { ThinkingMessage } from "./thinking-message";
export { ThinkingMessage };
import { SparklesIcon } from "lucide-react";

type ToolPartData = {
  type: string;
  toolCallId: string;
  state: string;
  toolName?: string;
  title?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function isToolPart(part: { type: string }): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function getToolDisplayName(part: ToolPartData): string {
  if (part.title) return part.title;
  if (
    part.input !== null &&
    typeof part.input === "object" &&
    "description" in (part.input as object)
  ) {
    const desc = (part.input as Record<string, unknown>).description;
    if (typeof desc === "string" && desc) return desc;
  }
  return "Processing requests";
}

function isToolDone(state: string): boolean {
  return (
    state === "output-available" ||
    state === "output-error" ||
    state === "output-denied" ||
    state === "approval-responded"
  );
}

function isToolRunning(state: string): boolean {
  return !isToolDone(state);
}

function ToolItem({
  tool,
  showLine,
  isLoading,
}: {
  tool: ToolPartData;
  showLine: boolean;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const running = isToolRunning(tool.state) && isLoading;
  const hasError =
    tool.state === "output-error" || (!isLoading && isToolRunning(tool.state));
  const displayName = getToolDisplayName(tool);

  const hasDetails =
    (tool.input !== undefined && tool.input !== null) ||
    (tool.output !== undefined && tool.output !== null) ||
    !!tool.errorText;

  return (
    <div className="relative flex">
      { }
      <div className="relative flex w-5 shrink-0 flex-col items-center">
        <div className="relative z-10 flex size-5 items-center justify-center">
          {running ? (
            <LoaderIcon className="size-3.5 animate-spin text-muted-foreground" />
          ) : hasError ? (
            <WrenchIcon className="size-3.5 text-destructive" />
          ) : (
            <WrenchIcon className="size-3.5 text-muted-foreground/70" />
          )}
        </div>
        {showLine && <div className="w-px flex-1 bg-border/60" />}
      </div>

      { }
      <div className="min-w-0 flex-1 pb-1.5 pl-2">
        <button
          type="button"
          onClick={() => hasDetails && setOpen(!open)}
          className={cn(
            "group/tool flex items-center gap-1 text-[13px] leading-relaxed text-muted-foreground transition-colors",
            hasDetails && "hover:text-foreground cursor-pointer",
            !hasDetails && "cursor-default",
          )}
        >
          <span className="text-left">{displayName}</span>
          {hasDetails && (
            <ChevronRightIcon
              className={cn(
                "size-3.5 transition-transform duration-200",
                open && "rotate-90",
              )}
            />
          )}
        </button>

        <AnimatePresence initial={false}>
          {open && hasDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}

              className="overflow-hidden"
            >
              <div className="mt-1 rounded-md border bg-muted/30 p-2.5 text-xs">
                {tool.input !== undefined && tool.input !== null && (
                  <div className="mb-2">
                    <div className="mb-1 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
                      Input
                    </div>
                    <pre className="whitespace-pre-wrap break-all text-foreground/80">
                      {typeof tool.input === "string"
                        ? tool.input
                        : JSON.stringify(tool.input, null, 2)}
                    </pre>
                  </div>
                )}
                {tool.errorText && (
                  <div>
                    <div className="mb-1 font-medium text-destructive text-[10px] uppercase tracking-wider">
                      Error
                    </div>
                    <pre className="whitespace-pre-wrap break-all text-destructive">
                      {tool.errorText}
                    </pre>
                  </div>
                )}
                {tool.output !== undefined &&
                  tool.output !== null &&
                  !tool.errorText && (
                    <div>
                      <div className="mb-1 font-medium text-muted-foreground text-[10px] uppercase tracking-wider">
                        Output
                      </div>
                      <pre className="whitespace-pre-wrap break-all text-foreground/80">
                        {typeof tool.output === "string"
                          ? tool.output
                          : JSON.stringify(tool.output, null, 2)}
                      </pre>
                    </div>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToolGroup({
  tools,
  isLoading,
}: {
  tools: ToolPartData[];
  isLoading: boolean;
}) {
  const allDone =
    tools.length > 0 && tools.every((t) => isToolDone(t.state) || !isLoading);

  return (
    <div className="py-0.5">
      { }
      {tools.map((tool, i) => {
        const isLast = i === tools.length - 1;
        const showLine = !isLast || allDone;
        return (
          <ToolItem
            key={tool.toolCallId ?? `tool-${i}`}
            tool={tool}
            showLine={showLine}
            isLoading={isLoading}
          />
        );
      })}

      { }
      {allDone && (
        <div className="relative flex">
          <div className="relative flex w-5 shrink-0 items-center justify-center">
            <CheckCircle2Icon className="size-3.5 text-muted-foreground/70" />
          </div>
          <div className="pl-2 text-[13px] leading-relaxed text-muted-foreground">
            Done
          </div>
        </div>
      )}
    </div>
  );
}

function PurePreviewMessage({
  chatId,
  message,
  vote,
  isLoading,
  isReadonly,
  onEdit,
}: {
  chatId: string;
  message: ChatMessage;
  vote: unknown;
  isLoading: boolean;
  isReadonly: boolean;
  onEdit?: (message: ChatMessage) => void;
}) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const hasAnyContent = message.parts?.some(
    (part) =>
      (part.type === "text" &&
        (part as { text: string }).text?.trim().length > 0) ||
      isToolPart(part),
  );
  const isThinking = isAssistant && isLoading && !hasAnyContent;

  const segments: Array<
    | { kind: "text"; node: ReactNode; key: string }
    | { kind: "tools"; tools: ToolPartData[]; key: string }
    | { kind: "other"; node: ReactNode; key: string }
  > = [];

  message.parts?.forEach((part, index) => {
    const key = `msg-${message.id}-${index}`;

    if (part.type === "text") {
      const text = (part as { text: string }).text;
      const isVoiceMsg = !!(
        message.metadata as Record<string, unknown> | undefined
      )?.voiceMessage;

      const hasContent = !!text?.trim();

      if (isUser && isVoiceMsg && !hasContent) {
        segments.push({
          kind: "text",
          key,
          node: <span key={key} />,
        });
        return;
      }

      if (!hasContent) return;

      segments.push({
        kind: "text",
        key,
        node: (
          <MessageContent
            key={key}
            className={cn("text-[13px] leading-[1.65]", {
              "w-fit max-w-[min(80%,56ch)] overflow-hidden wrap-break-words rounded-2xl rounded-br-lg border border-border/30 bg-secondary/50 text-accent-foreground/80 font-medium px-3.5 py-2 shadow-sm":
                isUser,
            })}
          >
            <MessageResponse

              caret={isAssistant && isLoading ? "block" : undefined}
              isAnimating={isAssistant && isLoading}
            >
              {sanitizeText(text)}
            </MessageResponse>
          </MessageContent>
        ),
      });
    } else if (isToolPart(part)) {
      const toolPart = part as unknown as ToolPartData;
      const lastSeg = segments[segments.length - 1];
      if (lastSeg && lastSeg.kind === "tools") {
        lastSeg.tools.push(toolPart);
      } else {
        segments.push({ kind: "tools", tools: [toolPart], key });
      }
    }
  });

  const renderedParts = segments.map((seg) => {
    if (seg.kind === "text" || seg.kind === "other") {
      return <React.Fragment key={seg.key}>{seg.node}</React.Fragment>;
    }
    return <ToolGroup key={seg.key} tools={seg.tools} isLoading={isLoading} />;
  });

  const actions = !isReadonly && (
    <MessageActions
      chatId={chatId}
      isLoading={isLoading}
      key={`action-${message.id}`}
      message={message}
      onEdit={onEdit ? () => onEdit(message) : undefined}
      vote={vote}
    />
  );

  const content = isThinking ? (
    <div className="flex h-[21.45px] items-center text-[13px] leading-[1.65]">
      <Shimmer className="font-medium" duration={1}>
        Thinking...
      </Shimmer>
    </div>
  ) : (
    <>
      {renderedParts}
      {actions}
    </>
  );

  return (
    <div
      className={cn("group/message w-full", !isAssistant && "animate-fade-up")}
      data-role={message.role}
    >
      <div
        className={cn(
          isUser ? "flex flex-col items-end gap-2" : "flex items-start gap-3",
        )}
      >
        {isAssistant && (
          <div className="flex h-[21.45px] shrink-0 items-center">
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground ring-1 ring-border/50">
              <SparklesIcon size={13} />
            </div>
          </div>
        )}
        {isAssistant ? (
          <div className="flex min-w-0 flex-1 flex-col gap-2">{content}</div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prev, next) =>
    prev.message === next.message &&
    prev.isLoading === next.isLoading &&
    prev.isReadonly === next.isReadonly &&
    prev.vote === next.vote &&
    prev.chatId === next.chatId,
);
