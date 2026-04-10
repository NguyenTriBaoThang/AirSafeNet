import { http } from "./http";
import type {
  AssistantChatRequest,
  AssistantChatResponse,
  ConversationDetailResponse,
  ConversationListItemResponse,
  CreateConversationResponse,
} from "../types/assistant";

export async function createConversationApi() {
  return http<CreateConversationResponse>("/api/assistant/conversations", {
    method: "POST",
    auth: true,
  });
}

export async function getConversationsApi() {
  return http<ConversationListItemResponse[]>("/api/assistant/conversations", {
    method: "GET",
    auth: true,
  });
}

export async function getConversationDetailApi(conversationId: number) {
  return http<ConversationDetailResponse>(
    `/api/assistant/conversations/${conversationId}`,
    {
      method: "GET",
      auth: true,
    }
  );
}

export async function deleteConversationApi(conversationId: number) {
  return http<void>(`/api/assistant/conversations/${conversationId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function sendAssistantMessageApi(payload: AssistantChatRequest) {
  return http<AssistantChatResponse>("/api/assistant/chat", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}