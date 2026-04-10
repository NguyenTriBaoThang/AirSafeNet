import { http } from "./http";
import type {
  AssistantChatRequest,
  AssistantChatResponse,
} from "../types/assistant";

export async function sendAssistantMessageApi(payload: AssistantChatRequest) {
  return http<AssistantChatResponse>("/api/assistant/chat", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}