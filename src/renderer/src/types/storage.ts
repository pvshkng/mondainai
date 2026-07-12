export type StoredChat = {
  id: string;
  title: string;
  userId: string;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  unread?: boolean;
  activeStreamId?: string | null;
};

export type StoredMessage = {
  id: string;
  chatId: string;

  userId?: string;
  role: "user" | "assistant" | "system";
  parts: unknown[];
  attachments: unknown[];
  createdAt: string;
};

export type Vote = {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
};

export type ChatHistory = {
  chats: StoredChat[];
  hasMore: boolean;
};

export interface ChatRepository {
  saveChat(
    chat: Omit<StoredChat, "createdAt" | "updatedAt">,
  ): Promise<StoredChat>;
  getChatById(id: string): Promise<StoredChat | null>;
  getChatsByUserId(params: {
    userId: string;
    limit: number;
    endingBefore?: string | null;
    startingAfter?: string | null;
  }): Promise<ChatHistory>;
  updateChatTitle(id: string, title: string): Promise<void>;
  updateChatVisibility(
    id: string,
    visibility: "public" | "private",
  ): Promise<void>;
  deleteChatById(id: string): Promise<void>;
  markChatAsRead(id: string): Promise<void>;
  deleteAllChatsByUserId(userId: string): Promise<void>;

  saveMessages(
    messages: Omit<StoredMessage, "createdAt">[],
    userId?: string,
  ): Promise<StoredMessage[]>;
  getMessagesByChatId(chatId: string): Promise<StoredMessage[]>;
  getMessageById(id: string): Promise<StoredMessage | null>;
  updateMessage(id: string, parts: unknown[]): Promise<void>;
  deleteMessagesAfterTimestamp(
    chatId: string,
    timestamp: string,
  ): Promise<void>;
  getMessageCountByUserId(userId: string, sinceHours: number): Promise<number>;

  saveVote(vote: Vote): Promise<void>;
  getVotesByChatId(chatId: string): Promise<Vote[]>;

  getActiveStreamId(chatId: string): Promise<string | null>;
  setActiveStreamId(chatId: string, streamId: string | null): Promise<void>;
}
