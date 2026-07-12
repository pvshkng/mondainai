
import type { UseChatHelpers } from "@ai-sdk/react";
import { useChat } from "@ai-sdk/react";
import { usePathname } from "@/lib/navigation";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { useModelStore } from "@/store/model-store";

import { unstable_serialize } from "swr/infinite";
import { getChatHistoryPaginationKey } from "@/components/chat/sidebar-history";
import { generateUUID } from "@/lib/utils";
import { messagesFetcher } from "@/lib/ipc-data";
import { IPCTransport } from "@/lib/ipc-transport";
import type { ChatMessage, VisibilityType } from "@/lib/types";

type ChatInstance = {
  chatId: string;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
};

type ActiveChatContextValue = {
  chatId: string;
  isNewChat: boolean;
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  status: UseChatHelpers<ChatMessage>["status"];
  stop: UseChatHelpers<ChatMessage>["stop"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  visibilityType: VisibilityType;
  isReadonly: boolean;
  isChatLoading: boolean;
  currentModelId: string;
  setCurrentModelId: (id: string) => void;
  onBeforeFirstSend: (chatId: string) => void;
  getChatStatus: (
    id: string,
  ) => UseChatHelpers<ChatMessage>["status"] | undefined;
};

type ActiveChatInputContextValue = {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
};

export const ActiveChatContext = createContext<ActiveChatContextValue | null>(
  null,
);

export const ActiveChatInputContext =
  createContext<ActiveChatInputContextValue | null>(null);

function extractChatId(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)/);
  return match ? match[1] : null;
}

const DEFAULT_MODEL = "gpt-4o-mini";

const instanceRegistry = new Map<string, ChatInstance>();

const pendingSessions = new Set<string>();

function ChatSession({
  chatId,
  initialMessages,
  visibility,
  isActive,
  onInstanceChanged,
  onFinish,
}: {
  chatId: string;
  initialMessages: ChatMessage[];
  visibility: VisibilityType;
  isActive: boolean;
  onInstanceChanged: (chatId: string) => void;
  onFinish: () => void;
}) {

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    generateId: generateUUID,
    transport: new IPCTransport<ChatMessage>({
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const selection = useModelStore.getState();
        return {
          body: {
            id: request.id,
            message: lastMessage,
            selectedVisibilityType: visibility,
            providerId: selection.providerId ?? undefined,
            modelId: selection.modelId ?? undefined,
            ...request.body,
          },
        };
      },
    }),
    onFinish,
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error("เกิดข้อผิดพลาด", {
        description:
          error?.message || "ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง",
      });
    },
    experimental_throttle: 50,
  });

  useEffect(() => {
    instanceRegistry.set(chatId, {
      chatId,
      messages,
      setMessages,
      sendMessage,
      status,
      stop,
      regenerate,
      addToolApprovalResponse,
    });
    if (isActive) {
      onInstanceChanged(chatId);
    }
  }, [
    messages,
    status,
    isActive,
    chatId,
    onInstanceChanged,
    setMessages,
    sendMessage,
    stop,
    regenerate,
    addToolApprovalResponse,
  ]);

  useEffect(() => {
    return () => {
      instanceRegistry.delete(chatId);

      pendingSessions.delete(chatId);
    };
  }, [chatId]);

  return null;
}

type SessionEntry = {
  chatId: string;
  initialMessages: ChatMessage[];
  visibility: VisibilityType;
};

export function ActiveChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mutate } = useSWRConfig();

  const chatIdFromUrl = extractChatId(pathname);
  const isNewChat = !chatIdFromUrl;

  const [newChatId, setNewChatId] = useState(generateUUID);
  const prevChatIdFromUrlRef = useRef(chatIdFromUrl);

  useEffect(() => {
    const prev = prevChatIdFromUrlRef.current;
    prevChatIdFromUrlRef.current = chatIdFromUrl;

    if (prev !== null && chatIdFromUrl === null) {
      setNewChatId(generateUUID());
    }
  }, [chatIdFromUrl]);

  const chatId = chatIdFromUrl ?? newChatId;

  const [currentModelId, setCurrentModelId] = useState(DEFAULT_MODEL);
  const [input, setInput] = useState("");

  const [sessions, setSessions] = useState<Map<string, SessionEntry>>(
    () => new Map(),
  );

  const [renderTick, setRenderTick] = useState(0);

  const activeChatIdRef = useRef(chatId);
  useEffect(() => {
    activeChatIdRef.current = chatId;
  }, [chatId]);

  const onInstanceChanged = useCallback((id: string) => {
    if (id === activeChatIdRef.current) {
      setRenderTick((v) => v + 1);
    }
  }, []);

  const onSessionFinish = useCallback(() => {
    mutate(unstable_serialize(getChatHistoryPaginationKey));
    setRenderTick((v) => v + 1);
  }, [mutate]);

  const hasSession = sessions.has(chatId);
  const shouldFetch = !isNewChat && !hasSession;
  const { data: chatData, isLoading: isSWRLoading } = useSWR(
    shouldFetch ? ["messages", chatId] : null,
    () => messagesFetcher(chatId),
    { revalidateOnFocus: false },
  );

  const visibility: VisibilityType = isNewChat
    ? "private"
    : (chatData?.visibility ?? "private");

  if (isNewChat && !sessions.has(chatId) && !pendingSessions.has(chatId)) {
    pendingSessions.add(chatId);
    const next = new Map(sessions);
    next.set(chatId, { chatId, initialMessages: [], visibility: "private" });
    setSessions(next);
  }

  if (
    !isNewChat &&
    !sessions.has(chatId) &&
    !pendingSessions.has(chatId) &&
    chatData?.messages
  ) {
    pendingSessions.add(chatId);
    const next = new Map(sessions);
    next.set(chatId, {
      chatId,
      initialMessages: chatData.messages,
      visibility: chatData.visibility ?? "private",
    });
    setSessions(next);
  }

  if (sessions.has(chatId) && pendingSessions.has(chatId)) {
    pendingSessions.delete(chatId);
  }

  const currentInstance = instanceRegistry.get(chatId);

  const hasAppendedQueryRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("query");
    const inst = instanceRegistry.get(chatId);
    if (query && !hasAppendedQueryRef.current && inst) {
      hasAppendedQueryRef.current = true;
      window.history.replaceState({}, "", `/chat/${chatId}`);
      inst.sendMessage({
        role: "user",
        parts: [{ type: "text", text: query }],
      });
    }
  }, [chatId, renderTick]);

  const onBeforeFirstSend = useCallback(
    (id: string) => {
      if (!sessions.has(id) && !pendingSessions.has(id)) {
        pendingSessions.add(id);
        setSessions((prev) => {
          const next = new Map(prev);
          next.set(id, {
            chatId: id,
            initialMessages: [],
            visibility: "private",
          });
          return next;
        });
      }
    },
    [sessions],
  );

  const getChatStatus = useCallback(
    (id: string) => instanceRegistry.get(id)?.status,

    [renderTick],
  );

  const isReadonly = isNewChat ? false : (chatData?.isReadonly ?? false);
  const isChatLoading = shouldFetch && isSWRLoading;

  const noopSetMessages: UseChatHelpers<ChatMessage>["setMessages"] =
    useCallback(() => {}, []);
  const noopSend: UseChatHelpers<ChatMessage>["sendMessage"] =
    useCallback(async () => {}, []);
  const noopStop: UseChatHelpers<ChatMessage>["stop"] =
    useCallback(async () => {}, []);
  const noopRegenerate: UseChatHelpers<ChatMessage>["regenerate"] =
    useCallback(async () => {}, []);
  const noopToolApproval: UseChatHelpers<ChatMessage>["addToolApprovalResponse"] =
    useCallback(() => {}, []);

  const value = useMemo<ActiveChatContextValue>(
    () => ({
      chatId,
      isNewChat,
      messages: currentInstance?.messages ?? [],
      setMessages: currentInstance?.setMessages ?? noopSetMessages,
      sendMessage: currentInstance?.sendMessage ?? noopSend,
      status: currentInstance?.status ?? "ready",
      stop: currentInstance?.stop ?? noopStop,
      regenerate: currentInstance?.regenerate ?? noopRegenerate,
      addToolApprovalResponse:
        currentInstance?.addToolApprovalResponse ?? noopToolApproval,
      visibilityType: visibility,
      isReadonly,
      isChatLoading,
      currentModelId,
      setCurrentModelId,
      onBeforeFirstSend,
      getChatStatus,
    }),

    [
      chatId,
      isNewChat,
      currentInstance,
      renderTick,
      visibility,
      isReadonly,
      isChatLoading,
      currentModelId,
      onBeforeFirstSend,
      getChatStatus,
      noopSetMessages,
      noopSend,
      noopStop,
      noopRegenerate,
      noopToolApproval,
    ],
  );

  const inputValue = useMemo<ActiveChatInputContextValue>(
    () => ({ input, setInput }),
    [input, setInput],
  );

  return (
    <ActiveChatContext.Provider value={value}>
      <ActiveChatInputContext.Provider value={inputValue}>
        {Array.from(sessions.values()).map((session) => (
          <ChatSession
            key={session.chatId}
            chatId={session.chatId}
            initialMessages={session.initialMessages}
            visibility={session.visibility}
            isActive={session.chatId === chatId}
            onInstanceChanged={onInstanceChanged}
            onFinish={onSessionFinish}
          />
        ))}
        {children}
      </ActiveChatInputContext.Provider>
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);
  const inputContext = useContext(ActiveChatInputContext);
  if (!context || !inputContext)
    throw new Error("useActiveChat must be used within ActiveChatProvider");
  return { ...context, ...inputContext };
}
