export type AssistantIntentAction = {
  type: string;
  label: string;
  route?: string | null;
  prompt?: string | null;
};

export type AssistantSourceMeta = {
  userGroup?: string;
  currentAqi?: number | null;
  currentPm25?: number | null;
  matchedPhrase?: string | null;
  targetTime?: string | null;
  isFallback?: boolean | null;
  matchedForecastTime?: string | null;
  matchedForecastAqi?: number | null;
  matchedForecastPm25?: number | null;
  dataUpdatedAt?: string | null;
  primarySource?: string | null;
  upstreamSources?: string[] | null;
  dataLabel?: string | null;
  confidence?: number | null;
  answerProvider?: string | null;
  fallbackLevel?: string | null;
  intent?: string | null;
  module?: string | null;
  moduleHints?: string[] | null;
  durationMinutes?: number | null;
  doseEstimateUg?: number | null;
  doseBudgetPercent?: number | null;
  maxOutdoorMinutes?: number | null;
  actions?: AssistantIntentAction[] | null;
};

export type AssistantChatRequest = {
  conversationId?: number | null;
  message: string;
};

export type AssistantChatResponse = {
  inDomain: boolean;
  answer: string;
  conversationId: number;
  source?: AssistantSourceMeta | null;
};

export type ChatMessage = {
  id: string | number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  meta?: AssistantChatResponse["source"];
  sourceMessage?: string;
  isStreaming?: boolean;
  streamedContent?: string;
  regeneratedCount?: number;
  updatedAt?: string | null;
  sourceUserMessageId?: number | null;
};

export type ConversationListItemResponse = {
  conversationId: number;
  title: string;
  isPinned: boolean;
  hasUnreadAssistantMessage: boolean;
  lastMessageRole?: "user" | "assistant" | string | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
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
  updatedAt?: string | null;
  regeneratedCount?: number;
  sourceUserMessageId?: number | null;
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