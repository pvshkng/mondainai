import { memo, useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import type { ChatMessage } from "@/lib/types";
import {
  MessageAction as Action,
  MessageActions as Actions,
} from "../ai-elements/message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CopyIcon, PencilEditIcon, ThumbDownIcon, ThumbUpIcon } from "./icons";

type VoteState = "up" | "down" | null;
type PendingVote = { type: "up" | "down"; value: 1 | 0 } | null;

type FeedbackDialogProps = {
  pendingVote: PendingVote;
  comment: string;
  submitting: boolean;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  onClose: (open: boolean) => void;
};

function FeedbackDialog({
  pendingVote,
  comment,
  submitting,
  onCommentChange,
  onSubmit,
  onClose,
}: FeedbackDialogProps) {
  return (
    <Dialog open={!!pendingVote} onOpenChange={onClose}>
      <DialogContent className="max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {pendingVote?.type === "up" ? "👍 Upvote" : "👎 Downvote"}
          </DialogTitle>
          <DialogDescription>
            {pendingVote?.type === "up"
              ? "What did you like about this response?"
              : "What could be improved about this response?"}
          </DialogDescription>
        </DialogHeader>

        <Textarea
          autoFocus
          className="min-h-[96px] resize-none text-xs"
          placeholder="Leave a comment (optional)…"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              onSubmit();
            }
          }}
        />

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={submitting} onClick={onSubmit}>
            Submit feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PureMessageActions({
  message,
  isLoading,
  onEdit,
}: {
  chatId?: string;
  message: ChatMessage;
  vote?: unknown;
  isLoading: boolean;
  onEdit?: () => void;
}) {
  const [, copyToClipboard] = useCopyToClipboard();
  const [vote, setVote] = useState<VoteState>(null);
  const [pendingVote, setPendingVote] = useState<PendingVote>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return null;

  const textFromParts = message.parts
    ?.filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join("\n")
    .trim();

  const handleCopy = async () => {
    if (!textFromParts) {
      toast.error("Nothing to copy");
      return;
    }
    await copyToClipboard(textFromParts);
    toast.success("Copied to clipboard!");
  };

  const openFeedbackDialog = (type: "up" | "down") => {
    setPendingVote({ type, value: type === "up" ? 1 : 0 });
    setComment("");
  };

  const handleSubmitFeedback = () => {
    if (!pendingVote) return;
    setSubmitting(true);
    setVote(pendingVote.type);
    setPendingVote(null);
    setComment("");
    setSubmitting(false);
    toast.success(pendingVote.type === "up" ? "Upvoted!" : "Downvoted!");
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setPendingVote(null);
      setComment("");
    }
  };

  if (message.role === "user") {
    return (
      <Actions className="-mr-0.5 justify-end opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
        <div className="flex items-center gap-0.5">
          {onEdit && (
            <Action
              className="size-7 text-muted-foreground/50 hover:text-foreground"
              onClick={onEdit}
              tooltip="Edit"
            >
              <PencilEditIcon />
            </Action>
          )}
          <Action
            className="size-7 text-muted-foreground/50 hover:text-foreground"
            onClick={handleCopy}
            tooltip="Copy"
          >
            <CopyIcon />
          </Action>
        </div>
      </Actions>
    );
  }

  return (
    <>
      <Actions className="-ml-0.5 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100">
        <Action
          className="text-muted-foreground/50 hover:text-foreground"
          onClick={handleCopy}
          tooltip="Copy"
        >
          <CopyIcon />
        </Action>
        <Action
          className="text-muted-foreground/50 hover:text-foreground"
          disabled={vote === "up"}
          onClick={() => {
            if (vote === "up") return;
            openFeedbackDialog("up");
          }}
          tooltip="Upvote"
        >
          <ThumbUpIcon />
        </Action>
        <Action
          className="text-muted-foreground/50 hover:text-foreground"
          disabled={vote === "down"}
          onClick={() => {
            if (vote === "down") return;
            openFeedbackDialog("down");
          }}
          tooltip="Downvote"
        >
          <ThumbDownIcon />
        </Action>
      </Actions>

      <FeedbackDialog
        pendingVote={pendingVote}
        comment={comment}
        submitting={submitting}
        onCommentChange={setComment}
        onSubmit={handleSubmitFeedback}
        onClose={handleDialogClose}
      />
    </>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prev, next) => prev.isLoading === next.isLoading,
);
