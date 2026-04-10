import type { ConversationListItemResponse } from "../../types/assistant";

type Props = {
  conversations: ConversationListItemResponse[];
  activeConversationId: number | null;
  onSelect: (conversationId: number) => void;
  onRename: (conversation: ConversationListItemResponse) => void;
};

export default function ConversationList({
  conversations,
  activeConversationId,
  onSelect,
  onRename,
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
          >
            <div className="chatgpt-history__item-title">{conversation.title}</div>
            <div className="chatgpt-history__item-time">
              {new Date(conversation.updatedAt).toLocaleString("vi-VN")}
            </div>
          </button>

          <button
            className="chatgpt-history__rename"
            onClick={() => onRename(conversation)}
            title="Đổi tên hội thoại"
          >
            ✎
          </button>
        </div>
      ))}
    </div>
  );
}