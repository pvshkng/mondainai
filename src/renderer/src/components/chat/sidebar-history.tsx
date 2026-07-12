import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { motion } from "motion/react";
import { Link, usePathname, useRouter } from "@/lib/navigation";
import { memo, useState } from "react";
import { toast } from "sonner";
import useSWRInfinite from "swr/infinite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { StoredChat as Chat, ChatHistory } from "@/types/storage";
import { historyFetcher } from "@/lib/ipc-data";
import { useActiveChat } from "@/hooks/use-active-chat";
import { useVoiceStore } from "@/store/voice-store";
import { LoaderIcon, MoreHorizontalIcon, TrashIcon } from "./icons";

export { type ChatHistory };

const PAGE_SIZE = 20;

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory | null,
): string | null {
  if (previousPageData && !previousPageData.hasMore) return null;
  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;
  const lastChat = previousPageData?.chats.at(-1);
  if (!lastChat) return null;
  return `/api/history?ending_before=${lastChat.id}&limit=${PAGE_SIZE}`;
}

export type User = { id: string; email: string; name?: string | null } | null;

function HistorySignInPrompt() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupContent>
        <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-[13px] text-sidebar-foreground/60">
          Sign in to save chats!
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function HistoryLoadingSkeleton() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
        History
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="flex flex-col gap-0.5 px-1">
          {[44, 32, 28, 64, 52].map((w) => (
            <div
              key={w}
              className="flex h-8 items-center gap-2 rounded-lg px-2"
            >
              <div
                className="h-3 flex-1 animate-pulse rounded-md bg-sidebar-foreground/[0.06]"
                style={{ maxWidth: `${w}%` }}
              />
            </div>
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function HistoryEmptyState() {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
        History
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="px-2 text-center text-[13px] text-sidebar-foreground/60">
          Your chats will appear here
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function groupChatsByDate(chats: Chat[]) {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);
  return chats.reduce(
    (groups, chat) => {
      const d = new Date(chat.createdAt);
      if (isToday(d)) groups.today.push(chat);
      else if (isYesterday(d)) groups.yesterday.push(chat);
      else if (d > oneWeekAgo) groups.lastWeek.push(chat);
      else if (d > oneMonthAgo) groups.lastMonth.push(chat);
      else groups.older.push(chat);
      return groups;
    },
    {
      today: [] as Chat[],
      yesterday: [] as Chat[],
      lastWeek: [] as Chat[],
      lastMonth: [] as Chat[],
      older: [] as Chat[],
    },
  );
}

type ChatItemProps = {
  chat: Chat;
  isActive: boolean;
  isStreaming: boolean;
  onDelete: (id: string) => void;
  onClose: () => void;
};

const PureChatItem = ({
  chat,
  isActive,
  isStreaming,
  onDelete,
  onClose,
}: ChatItemProps) => {
  const { isVoiceMode, isVoiceConnected } = useVoiceStore();
  const [showVoiceWarning, setShowVoiceWarning] = useState(false);
  const router = useRouter();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="h-8 rounded-none text-[13px] text-sidebar-foreground/50 transition-all duration-150 hover:bg-transparent hover:text-sidebar-foreground data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium"
      >
        <Link
          href={`/chat/${chat.id}`}
          onClick={(e) => {
            if (isVoiceMode && isVoiceConnected && !isActive) {
              e.preventDefault();
              setShowVoiceWarning(true);
              return;
            }
            if (chat.unread) {
              window.api.chat.markRead(chat.id);
            }
            onClose();
          }}
        >
          <span className="truncate">{chat.title}</span>
          {chat.unread && (
            <span className="ml-auto size-2 shrink-0 rounded-full bg-primary" />
          )}
        </Link>
      </SidebarMenuButton>
      {isStreaming ? (
        <SidebarMenuAction className="rounded-md text-sidebar-foreground/50">
          <div className="animate-spin">
            <LoaderIcon />
          </div>
        </SidebarMenuAction>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction
              showOnHover={!isActive}
              className="rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <MoreHorizontalIcon />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom">
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onDelete(chat.id)}
            >
              <TrashIcon />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <AlertDialog open={showVoiceWarning} onOpenChange={setShowVoiceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End voice session?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching chats will end your current voice session. Your voice
              conversation will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (chat.unread) {
                  window.api.chat.markRead(chat.id);
                }
                onClose();
                router.push(`/chat/${chat.id}`);
              }}
            >
              End session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prev, next) => {
  if (prev.isActive !== next.isActive) return false;
  if (prev.isStreaming !== next.isStreaming) return false;
  if (prev.chat.title !== next.chat.title) return false;
  if (prev.chat.unread !== next.chat.unread) return false;
  return true;
});

export function SidebarHistoryContent({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { getChatStatus } = useActiveChat();
  const activeChatId = pathname?.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  const {
    data: pages,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(
    user ? getChatHistoryPaginationKey : () => null,
    historyFetcher,
    { fallbackData: [], revalidateOnFocus: false },
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const hasReachedEnd = pages?.some((p) => !p.hasMore) ?? false;
  const hasEmptyChatHistory =
    pages?.every((p) => p.chats.length === 0) ?? false;

  const handleDelete = () => {
    const id = deleteId;
    setShowDeleteDialog(false);
    if (pathname === `/chat/${id}`) router.replace("/");
    mutate((pages) =>
      pages?.map((p) => ({ ...p, chats: p.chats.filter((c) => c.id !== id) })),
    );
    if (id) window.api.chat.delete(id);
    toast.success("Chat deleted");
  };

  if (!user) {
    return <HistorySignInPrompt />;
  }

  if (isLoading) {
    return <HistoryLoadingSkeleton />;
  }

  if (hasEmptyChatHistory) {
    return <HistoryEmptyState />;
  }

  const allChats = pages?.flatMap((p) => p.chats) ?? [];
  const grouped = groupChatsByDate(allChats);
  const groups = [
    { label: "Today", chats: grouped.today },
    { label: "Yesterday", chats: grouped.yesterday },
    { label: "Last 7 days", chats: grouped.lastWeek },
    { label: "Last 30 days", chats: grouped.lastMonth },
    { label: "Older", chats: grouped.older },
  ].filter((g) => g.chats.length > 0);

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
          History
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <div className="flex flex-col gap-4">
              {groups.map(({ label, chats }) => (
                <div key={label}>
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/70">
                    {label}
                  </div>
                  {chats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === activeChatId}
                      isStreaming={(() => {
                        const s = getChatStatus(chat.id);
                        return s === "streaming" || s === "submitted";
                      })()}
                      onDelete={(id) => {
                        setDeleteId(id);
                        setShowDeleteDialog(true);
                      }}
                      onClose={() => {
                        if (chat.unread) {
                          mutate(
                            (pages) =>
                              pages?.map((p) => ({
                                ...p,
                                chats: p.chats.map((c) =>
                                  c.id === chat.id
                                    ? { ...c, unread: false }
                                    : c,
                                ),
                              })),
                            { revalidate: false },
                          );
                        }
                        onClose();
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </SidebarMenu>

          <motion.div
            onViewportEnter={() => {
              if (!isValidating && !hasReachedEnd) setSize((s) => s + 1);
            }}
          />

          {!hasReachedEnd && (
            <div className="mt-1 flex items-center gap-2 px-4 py-2 text-sidebar-foreground/50">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div className="text-[11px]">Loading...</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function SidebarHistory({ user }: { user: User }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarHistoryContent user={user} onClose={() => setOpenMobile(false)} />
  );
}
