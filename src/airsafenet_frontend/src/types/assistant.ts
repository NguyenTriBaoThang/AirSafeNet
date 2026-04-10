export type AssistantChatRequest = {
  conversationId?: number | null;
  message: string;
};

export type AssistantChatResponse = {
  inDomain: boolean;
  answer: string;
  conversationId: number;
  source?: {
    userGroup?: string;
    currentAqi?: number;
    currentPm25?: number;
    matchedForecastTime?: string;
    matchedForecastAqi?: number;
    matchedForecastPm25?: number;
  } | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  meta?: AssistantChatResponse["source"];
};

export type ConversationListItemResponse = {
  conversationId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type ConversationMessageResponse = {
  messageId: number;
  role: "user" | "assistant";
  content: string;
  userGroup?: string | null;
  currentAqi?: number | null;
  currentPm25?: number | null;
  createdAt: string;
};

export type ConversationDetailResponse = {
  conversationId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessageResponse[];
};

export type CreateConversationResponse = {
  conversationId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};