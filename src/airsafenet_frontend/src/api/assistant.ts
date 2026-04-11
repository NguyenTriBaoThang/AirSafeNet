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

/*
export async function getConversationsApi() {
  return http<ConversationListItemResponse[]>("/api/assistant/conversations", {
    method: "GET",
    auth: true,
  });
}
  */

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

export async function renameConversationApi( conversationId: number, title: string) {
  return http<{
    conversationId: number;
    title: string;
    updatedAt: string;
  }>(`/api/assistant/conversations/${conversationId}/rename`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ title }),
  });
}

export type ConversationSort = "recent" | "oldest" | "title";

export async function getConversationsApi(sort: ConversationSort = "recent") {
  return http<ConversationListItemResponse[]>(
    `/api/assistant/conversations?sort=${sort}`,
    {
      method: "GET",
      auth: true,
    }
  );
}

export async function pinConversationApi(
  conversationId: number,
  isPinned: boolean
) {
  return http<{
    conversationId: number;
    isPinned: boolean;
    updatedAt: string;
  }>(`/api/assistant/conversations/${conversationId}/pin`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ isPinned }),
  });
}