import { useEffect, useMemo, useRef, useState } from "react";
import { sendAssistantMessageApi } from "../api/assistant";
import type { ChatConversation, ChatMessage } from "../types/assistant";
import { useToast } from "../components/common/useToast";
import ConversationList from "../components/assistant/ConversationList";
import { loadConversations, saveConversations } from "../utils/assistantStorage";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const STARTER_PROMPTS = [
  "Chiều nay chất lượng không khí có ổn không?",
  "Trẻ em có nên ra ngoài lúc 5 giờ chiều không?",
  "Người có bệnh hô hấp nên lưu ý gì hôm nay?",
  "3 ngày tới có thời điểm nào không nên tập thể dục ngoài trời?",
];

function createWelcomeMessage(): ChatMessage {
  return {
    id: makeId(),
    role: "assistant",
    content:
      "Xin chào, mình là trợ lý ảo AirSafeNet. Mình có thể hỗ trợ giải thích AQI, PM2.5, dự báo chất lượng không khí và khuyến nghị sức khỏe liên quan.",
    createdAt: new Date().toISOString(),
  };
}

function createNewConversation(): ChatConversation {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    title: "Cuộc trò chuyện mới",
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage()],
  };
}

function getConversationTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (!firstUserMessage) return "Cuộc trò chuyện mới";

  const text = firstUserMessage.content.trim();
  return text.length > 42 ? `${text.slice(0, 42)}...` : text;
}

export default function AssistantPage() {
  const { showToast } = useToast();
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const messages = activeConversation?.messages ?? [];

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    const stored = loadConversations();

    if (stored.length > 0) {
      const sorted = [...stored].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setConversations(sorted);
      setActiveConversationId(sorted[0].id);
    } else {
      const initial = createNewConversation();
      setConversations([initial]);
      setActiveConversationId(initial.id);
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  function updateActiveConversation(
    updater: (conversation: ChatConversation) => ChatConversation
  ) {
    if (!activeConversationId) return;

    setConversations((prev) => {
      const updated = prev.map((conversation) =>
        conversation.id === activeConversationId ? updater(conversation) : conversation
      );

      return [...updated].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });
  }

  async function handleSend(text?: string) {
    const finalText = (text ?? input).trim();
    if (!finalText || loading || !activeConversationId) return;

    const now = new Date().toISOString();

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: finalText,
      createdAt: now,
    };

    updateActiveConversation((conversation) => {
      const newMessages = [...conversation.messages, userMessage];
      return {
        ...conversation,
        messages: newMessages,
        title: getConversationTitle(newMessages),
        updatedAt: now,
      };
    });

    setInput("");
    setLoading(true);

    try {
      const result = await sendAssistantMessageApi({ message: finalText });

      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: result.answer,
        createdAt: new Date().toISOString(),
        meta: result.source ?? undefined,
      };

      updateActiveConversation((conversation) => {
        const newMessages = [...conversation.messages, assistantMessage];
        return {
          ...conversation,
          messages: newMessages,
          title: getConversationTitle(newMessages),
          updatedAt: new Date().toISOString(),
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể gửi câu hỏi";
      showToast(message, "error");

      const assistantMessage: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: "Mình đang gặp sự cố khi xử lý câu hỏi này. Bạn thử lại sau một chút nhé.",
        createdAt: new Date().toISOString(),
      };

      updateActiveConversation((conversation) => {
        const newMessages = [...conversation.messages, assistantMessage];
        return {
          ...conversation,
          messages: newMessages,
          title: getConversationTitle(newMessages),
          updatedAt: new Date().toISOString(),
        };
      });
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    const newConversation = createNewConversation();
    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setInput("");
  }

  function handleSelectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
  }

  function handleDeleteConversation() {
    if (!activeConversationId) return;

    const filtered = conversations.filter((c) => c.id !== activeConversationId);

    if (filtered.length === 0) {
      const newConversation = createNewConversation();
      setConversations([newConversation]);
      setActiveConversationId(newConversation.id);
      return;
    }

    setConversations(filtered);
    setActiveConversationId(filtered[0].id);
    showToast("Đã xóa hội thoại", "success");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const onlyWelcome =
    messages.length === 1 && messages[0]?.role === "assistant";

  return (
    <div className="chatgpt-layout">
      <aside className="chatgpt-sidebar">
        <div className="chatgpt-sidebar__top">
          <div className="chatgpt-brand">
            <div className="chatgpt-brand__logo">A</div>
            <div>
              <strong>AirSafeNet</strong>
              <span>Assistant</span>
            </div>
          </div>

          <button className="chatgpt-newchat-btn" onClick={handleNewChat}>
            + Cuộc trò chuyện mới
          </button>
        </div>

        <div className="chatgpt-history">
          <div className="chatgpt-history__title">Hội thoại gần đây</div>
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={handleSelectConversation}
          />
        </div>
      </aside>

      <main className="chatgpt-main">
        <div className="chatgpt-main__header">
          <div>
            <h1>Trợ lý ảo AirSafeNet</h1>
            <p>Hỏi đáp tự nhiên về AQI, PM2.5, forecast và khuyến nghị sức khỏe</p>
          </div>

          <button className="btn btn-secondary" onClick={handleDeleteConversation}>
            Xóa hội thoại
          </button>
        </div>

        <div className="chatgpt-messages" ref={listRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chatgpt-message-row ${
                message.role === "user" ? "is-user" : "is-assistant"
              }`}
            >
              <div className="chatgpt-message">
                <div className="chatgpt-message__avatar">
                  {message.role === "user" ? "U" : "A"}
                </div>

                <div className="chatgpt-message__body">
                  <div className="chatgpt-message__role">
                    {message.role === "user" ? "Bạn" : "AirSafeNet Assistant"}
                  </div>

                  <div className="chatgpt-message__content">{message.content}</div>

                  {message.role === "assistant" && message.meta ? (
                    <div className="chatgpt-message__meta">
                      {typeof message.meta.currentAqi === "number" ? (
                        <span>AQI hiện tại: {message.meta.currentAqi}</span>
                      ) : null}
                      {typeof message.meta.currentPm25 === "number" ? (
                        <span>PM2.5: {message.meta.currentPm25}</span>
                      ) : null}
                      {message.meta.userGroup ? (
                        <span>Nhóm: {message.meta.userGroup}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {loading ? (
            <div className="chatgpt-message-row is-assistant">
              <div className="chatgpt-message">
                <div className="chatgpt-message__avatar">A</div>
                <div className="chatgpt-message__body">
                  <div className="chatgpt-message__role">AirSafeNet Assistant</div>
                  <div className="chatgpt-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {onlyWelcome ? (
            <div className="chatgpt-starters">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="chatgpt-starter-card"
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="chatgpt-composer-wrap">
          <div className="chatgpt-composer">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về chất lượng không khí, AQI, PM2.5 hoặc khuyến nghị sức khỏe..."
            />
            <button
              className="chatgpt-send-btn"
              disabled={!canSend}
              onClick={() => handleSend()}
            >
              Gửi
            </button>
          </div>
          <div className="chatgpt-composer__hint">
            Enter để gửi • Shift + Enter để xuống dòng
          </div>
        </div>
      </main>
    </div>
  );
}