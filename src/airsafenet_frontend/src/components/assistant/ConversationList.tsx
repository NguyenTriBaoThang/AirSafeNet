import type { ConversationListItemResponse } from "../../types/assistant";
import ConversationMenu from "./ConversationMenu";

type Props = {
  conversations: ConversationListItemResponse[];
  activeConversationId: number | null;
  onSelect: (conversationId: number) => void;
  onRename: (conversation: ConversationListItemResponse) => void;
  onDelete: (conversation: ConversationListItemResponse) => void;
  onPinToggle: (conversation: ConversationListItemResponse) => void;
};

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onRename,
  onDelete,
  onPinToggle,
}: Props) {
  if (conversations.length === 0) {
    return <div className="chatgpt-history__empty">Chưa có hội thoại nào</div>;
  }

  return (
    <div className="chatgpt-history__list">
      {conversations.map((conversation) => (
        <div
          key={conversation.conversationId}
          className={`chatgpt-history-card ${
            activeConversationId === conversation.conversationId ? "active" : ""
          }`}
        >
          <button
            className="chatgpt-history__item"
            onClick={() => onSelect(conversation.conversationId)}
            type="button"
          >
            <div className="chatgpt-history__item-header">
              <div className="chatgpt-history__item-title">{conversation.title}</div>
              {conversation.isPinned ? (
                <span className="chatgpt-history__pin">📌</span>
              ) : null}
            </div>

            <div className="chatgpt-history__item-preview">
              {conversation.lastMessagePreview || "Chưa có tin nhắn"}
            </div>

            <div className="chatgpt-history__item-time">
              {new Date(conversation.lastMessageAt || conversation.updatedAt).toLocaleString("vi-VN")}
            </div>
          </button>

          <ConversationMenu
            isPinned={conversation.isPinned}
            onPinToggle={() => onPinToggle(conversation)}
            onRename={() => onRename(conversation)}
            onDelete={() => onDelete(conversation)}
          />
        </div>
      ))}
    </div>
  );
}