import type { ChatMessage } from "../../types/assistant";

type Props = {
  message: ChatMessage;
};

export default function ChatBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`chat-bubble-row ${isUser ? "is-user" : "is-assistant"}`}>
      {!isUser && <div className="chat-avatar">A</div>}

      <div className={`chat-bubble ${isUser ? "chat-bubble--user" : "chat-bubble--assistant"}`}>
        <div className="chat-bubble__content">{message.content}</div>

        {message.role === "assistant" && message.meta ? (
          <div className="chat-bubble__meta">
            {message.meta.userGroup ? (
              <span>Nhóm: {message.meta.userGroup}</span>
            ) : null}
            {typeof message.meta.currentAqi === "number" ? (
              <span>AQI hiện tại: {message.meta.currentAqi}</span>
            ) : null}
            {typeof message.meta.currentPm25 === "number" ? (
              <span>PM2.5: {message.meta.currentPm25}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      {isUser && <div className="chat-avatar chat-avatar--user">U</div>}
    </div>
  );
}