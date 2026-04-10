import type { ConversationListItemResponse } from "../../types/assistant";

type Props = {
  conversations: ConversationListItemResponse[];
  activeConversationId: number | null;
  onSelect: (conversationId: number) => void;
};

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
}: Props) {
  if (conversations.length === 0) {
    return <div className="chatgpt-history__empty">Chưa có hội thoại nào</div>;
  }

  return (
    <div className="chatgpt-history__list">
      {conversations.map((conversation) => (
        <button
          key={conversation.conversationId}
          className={`chatgpt-history__item ${
            activeConversationId === conversation.conversationId ? "active" : ""
          }`}
          onClick={() => onSelect(conversation.conversationId)}
        >
          <div className="chatgpt-history__item-title">{conversation.title}</div>
          <div className="chatgpt-history__item-time">
            {new Date(conversation.updatedAt).toLocaleString("vi-VN")}
          </div>
        </button>
      ))}
    </div>
  );
}