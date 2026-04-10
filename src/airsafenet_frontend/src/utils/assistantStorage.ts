import type { ChatConversation } from "../types/assistant";

const STORAGE_KEY = "airsafenet_assistant_conversations";

export function loadConversations(): ChatConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatConversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: ChatConversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}