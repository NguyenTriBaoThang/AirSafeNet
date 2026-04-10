export type AssistantChatRequest = {
  message: string;
};

export type AssistantChatResponse = {
  inDomain: boolean;
  answer: string;
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