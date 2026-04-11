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

function isToday(dateString?: string | null) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isYesterday(dateString?: string | null) {
  if (!dateString) return false;
  const date = new Date(dateString);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

function ConversationGroup({
  title,
  conversations,
  activeConversationId,
  onSelect,
  onRename,
  onDelete,
  onPinToggle,
}: {
  title: string;
  conversations: ConversationListItemResponse[];
  activeConversationId: number | null;
  onSelect: (conversationId: number) => void;
  onRename: (conversation: ConversationListItemResponse) => void;
  onDelete: (conversation: ConversationListItemResponse) => void;
  onPinToggle: (conversation: ConversationListItemResponse) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <div className="chatgpt-history-group">
      <div className="chatgpt-history-group__title">{title}</div>

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
                <div className="chatgpt-history__item-title-wrap">
                  <div className="chatgpt-history__item-title">{conversation.title}</div>

                  {conversation.isPinned ? (
                    <span className="chatgpt-history__pin">📌</span>
                  ) : null}
                </div>

                <span className="chatgpt-history__count-badge">
                  {conversation.messageCount}
                </span>
              </div>

              <div className="chatgpt-history__item-preview">
                {conversation.lastMessagePreview || "Chưa có tin nhắn"}
              </div>

              <div className="chatgpt-history__item-time">
                {new Date(
                  conversation.lastMessageAt || conversation.updatedAt
                ).toLocaleString("vi-VN")}
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
    </div>
  );
}

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

  const pinnedConversations = conversations.filter((c) => c.isPinned);
  const recentConversations = conversations.filter((c) => !c.isPinned);

  const todayConversations = recentConversations.filter((c) =>
    isToday(c.lastMessageAt || c.updatedAt)
  );

  const yesterdayConversations = recentConversations.filter((c) =>
    isYesterday(c.lastMessageAt || c.updatedAt)
  );

  const olderConversations = recentConversations.filter((c) => {
    const time = c.lastMessageAt || c.updatedAt;
    return !isToday(time) && !isYesterday(time);
  });

  return (
    <div className="chatgpt-history-sections">
      <ConversationGroup
        title="Pinned"
        conversations={pinnedConversations}
        activeConversationId={activeConversationId}
        onSelect={onSelect}
        onRename={onRename}
        onDelete={onDelete}
        onPinToggle={onPinToggle}
      />

      <ConversationGroup
        title="Today"
        conversations={todayConversations}
        activeConversationId={activeConversationId}
        onSelect={onSelect}
        onRename={onRename}
        onDelete={onDelete}
        onPinToggle={onPinToggle}
      />

      <ConversationGroup
        title="Yesterday"
        conversations={yesterdayConversations}
        activeConversationId={activeConversationId}
        onSelect={onSelect}
        onRename={onRename}
        onDelete={onDelete}
        onPinToggle={onPinToggle}
      />

      <ConversationGroup
        title="Older"
        conversations={olderConversations}
        activeConversationId={activeConversationId}
        onSelect={onSelect}
        onRename={onRename}
        onDelete={onDelete}
        onPinToggle={onPinToggle}
      />
    </div>
  );
}