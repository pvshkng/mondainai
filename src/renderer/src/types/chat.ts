import type { UIMessage } from "ai";

export type CustomUIDataTypes = {
  "chat-title": string;
};

export type ChatMessage = UIMessage<Record<string, unknown>, CustomUIDataTypes>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

export type VisibilityType = "public" | "private";
