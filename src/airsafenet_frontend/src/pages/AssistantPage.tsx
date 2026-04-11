import { useEffect, useMemo, useRef, useState } from "react";
import {
  createConversationApi,
  deleteConversationApi,
  getConversationDetailApi,
  getConversationsApi,
  renameConversationApi,
  sendAssistantMessageApi,
} from "../api/assistant";
import type {
  ChatMessage,
  ConversationDetailResponse,
  ConversationListItemResponse,
} from "../types/assistant";
import { pinConversationApi } from "../api/assistant";
import { markConversationAsReadApi } from "../api/assistant";
import { regenerateAssistantMessageApi } from "../api/assistant";
import type { ConversationSort } from "../api/assistant";
import { useToast } from "../components/common/useToast";
import ConversationList from "../components/assistant/ConversationList";
import EmptyState from "../components/common/EmptyState";
import AssistantMarkdown from "../components/assistant/AssistantMarkdown";
import MessageActions from "../components/assistant/MessageActions";
import StreamingAssistantMessage from "../components/assistant/StreamingAssistantMessage";

function makeTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const STARTER_PROMPTS = [
  "Chiều nay chất lượng không khí có ổn không?",
  "Trẻ em có nên ra ngoài lúc 5 giờ chiều không?",
  "Người có bệnh hô hấp nên lưu ý gì hôm nay?",
  "3 ngày tới có thời điểm nào không nên tập thể dục ngoài trời?",
];

function mapConversationMessages(detail: ConversationDetailResponse): ChatMessage[] {
  const mapped = detail.messages.map((m) => ({
    id: String(m.messageId),
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
    isStreaming: false,
    meta:
      m.role === "assistant"
        ? {
            userGroup: m.userGroup ?? undefined,
            currentAqi:
              typeof m.currentAqi === "number" ? m.currentAqi : undefined,
            currentPm25:
              typeof m.currentPm25 === "number" ? m.currentPm25 : undefined,
          }
        : undefined,
  })) as ChatMessage[];

  for (let i = 0; i < mapped.length; i++) {
    if (mapped[i].role === "assistant") {
      const prevUser = [...mapped.slice(0, i)].reverse().find((x) => x.role === "user");
      if (prevUser) {
        mapped[i].sourceMessage = prevUser.content;
      }
    }
  }

  return mapped;
}

export default function AssistantPage() {
  const { showToast } = useToast();

  const [sort, setSort] = useState<ConversationSort>("recent");

  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItemResponse[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [input, setInput] = useState("");
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");

  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading && !detailLoading,
    [input, loading, detailLoading]
  );

  const filteredConversations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return conversations;
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(keyword)
    );
  }, [conversations, search]);

  async function loadConversations(selectLatest = true, sortValue = sort) {
    try {
      setSidebarLoading(true);
      setPageError("");

      const list = await getConversationsApi(sortValue);
      setConversations(list);

      if (list.length === 0) {
        setActiveConversationId(null);
        setMessages([]);
        return;
      }

      if (selectLatest) {
        const firstId = list[0].conversationId;
        setActiveConversationId(firstId);
        await loadConversationDetail(firstId);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không tải được danh sách hội thoại";
      setPageError(message);
      showToast(message, "error");
    } finally {
      setSidebarLoading(false);
    }
  }

  async function handlePinToggle(conversation: ConversationListItemResponse) {
  try {
    const result = await pinConversationApi(
      conversation.conversationId,
      !conversation.isPinned
    );

    setConversations((prev) =>
      prev.map((item) =>
        item.conversationId === conversation.conversationId
          ? { ...item, isPinned: result.isPinned, updatedAt: result.updatedAt }
          : item
      )
    );

    await loadConversations(false, sort);

    showToast(
      result.isPinned ? "Đã ghim hội thoại" : "Đã bỏ ghim hội thoại",
      "success"
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không cập nhật được trạng thái ghim";
    showToast(message, "error");
  }
}

  async function loadConversationDetail(conversationId: number) {
    try {
      setDetailLoading(true);
      const detail = await getConversationDetailApi(conversationId);
      setActiveConversationId(detail.conversationId);
      setMessages(mapConversationMessages(detail));

      try {
        await markConversationAsReadApi(conversationId);
        setConversations((prev) =>
          prev.map((item) =>
            item.conversationId === conversationId
              ? { ...item, hasUnreadAssistantMessage: false }
              : item
          )
        );
      } catch {
        // bỏ qua lỗi mark as read
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không tải được nội dung hội thoại";
      showToast(message, "error");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleNewChat() {
    try {
      const created = await createConversationApi();
      await loadConversations(false);

      setActiveConversationId(created.conversationId);
      setMessages([]);

      setConversations((prev) => [
        {
          conversationId: created.conversationId,
          title: created.title,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
          messageCount: 0,
          isPinned: false,
          hasUnreadAssistantMessage: false, // 👈 FIX
        },
        ...prev.filter((x) => x.conversationId !== created.conversationId),
      ]);

      showToast("Đã tạo cuộc trò chuyện mới", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không tạo được hội thoại mới";
      showToast(message, "error");
    }
  }

  async function handleDeleteConversation(conversation?: ConversationListItemResponse) {
    const targetId = conversation?.conversationId ?? activeConversationId;
    if (!targetId) return;

    try {
      await deleteConversationApi(targetId);
      showToast("Đã xóa hội thoại", "success");

      const remaining = conversations.filter((x) => x.conversationId !== targetId);
      setConversations(remaining);

      if (activeConversationId === targetId) {
        if (remaining.length > 0) {
          const nextId = remaining[0].conversationId;
          setActiveConversationId(nextId);
          await loadConversationDetail(nextId);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không xóa được hội thoại";
      showToast(message, "error");
    }
  }

  async function handleRenameConversation(conversation: ConversationListItemResponse) {
    const newTitle = window.prompt("Nhập tên mới cho hội thoại", conversation.title);

    if (newTitle == null) return;
    const trimmed = newTitle.trim();

    if (!trimmed) {
      showToast("Tên hội thoại không được để trống", "error");
      return;
    }

    try {
      const result = await renameConversationApi(conversation.conversationId, trimmed);

      setConversations((prev) =>
        prev.map((item) =>
          item.conversationId === conversation.conversationId
            ? { ...item, title: result.title, updatedAt: result.updatedAt }
            : item
        )
      );

      showToast("Đã đổi tên hội thoại", "success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không đổi được tên hội thoại";
      showToast(message, "error");
    }
  }

  async function handleSend(text?: string) {
    const finalText = (text ?? input).trim();
    if (!finalText || loading || detailLoading) return;

    const userTempMessage: ChatMessage = {
      id: makeTempId(),
      role: "user",
      content: finalText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userTempMessage]);
    setInput("");
    setLoading(true);

    try {
      const result = await sendAssistantMessageApi({
        conversationId: activeConversationId,
        message: finalText,
      });

      if (!activeConversationId) {
        setActiveConversationId(result.conversationId);
      }

      const assistantTempId = makeTempId();

      const assistantStreamingMessage: ChatMessage = {
        id: assistantTempId,
        role: "assistant",
        content: result.answer,
        createdAt: new Date().toISOString(),
        meta: result.source ?? undefined,
        sourceMessage: finalText,
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantStreamingMessage]);

      await loadConversations(false);

      // Sau khi hiệu ứng stream xong mới sync lại từ backend
      window.setTimeout(async () => {
        await loadConversationDetail(result.conversationId);
      }, Math.min(Math.max(result.answer.length * 18, 900), 5000));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể gửi câu hỏi";
      showToast(message, "error");

      setMessages((prev) => [
        ...prev,
        {
          id: makeTempId(),
          role: "assistant",
          content:
            "Mình đang gặp sự cố khi xử lý câu hỏi này. Bạn thử lại sau một chút nhé.",
          createdAt: new Date().toISOString(),
          sourceMessage: finalText,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate(message: ChatMessage) {
    if (loading || detailLoading) return;
    if (!activeConversationId) return;
    if (typeof message.id !== "number") return;

    try {
      setRegeneratingMessageId(String(message.id));

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: "",
                isStreaming: true,
              }
            : item
        )
      );

      const result = await regenerateAssistantMessageApi(
        activeConversationId,
        message.id
      );

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: result.answer,
                meta: result.source ?? undefined,
                isStreaming: true,
                regeneratedCount: result.regeneratedCount,
                updatedAt: result.updatedAt,
              }
            : item
        )
      );

      await loadConversations(false);

      window.setTimeout(async () => {
        await loadConversationDetail(result.conversationId);
        setRegeneratingMessageId(null);
      }, Math.min(Math.max(result.answer.length * 18, 900), 5000));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể regenerate câu trả lời";

      showToast(errorMessage, "error");

      setMessages((prev) =>
        prev.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content:
                  "Mình đang gặp sự cố khi tạo lại câu trả lời này. Bạn thử lại sau một chút nhé.",
                isStreaming: false,
              }
            : item
        )
      );

      setRegeneratingMessageId(null);
    }
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      showToast("Đã copy câu trả lời", "success");
    } catch {
      showToast("Không thể copy nội dung", "error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    loadConversations(true);
  }, []);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${Math.min(
      textareaRef.current.scrollHeight,
      180
    )}px`;
  }, [input]);

  useEffect(() => {
    if (!listRef.current) return;

    const el = listRef.current;
    const timer = window.setInterval(() => {
      el.scrollTop = el.scrollHeight;
    }, 80);

    return () => window.clearInterval(timer);
  }, [messages]);

  const emptyConversation = messages.length === 0;

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

          <input
            className="chatgpt-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm hội thoại..."
          />

          <select
            className="chatgpt-sort"
            value={sort}
            onChange={(e) => {
              const nextSort = e.target.value as ConversationSort;
              setSort(nextSort);
              loadConversations(false, nextSort);
            }}
          >
            <option value="recent">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="title">Theo tên</option>
          </select>

        </div>

        <div className="chatgpt-history">
          <div className="chatgpt-history__title">Hội thoại gần đây</div>

          {sidebarLoading ? (
            <div className="chatgpt-history__empty">Đang tải hội thoại...</div>
          ) : (
            <ConversationList
              conversations={filteredConversations}
              activeConversationId={activeConversationId}
              onSelect={loadConversationDetail}
              onRename={handleRenameConversation}
              onDelete={handleDeleteConversation}
              onPinToggle={handlePinToggle}
            />
          )}
        </div>
      </aside>

      <main className="chatgpt-main">
        <div className="chatgpt-main__header">
          <div>
            <h1>Trợ lý ảo AirSafeNet</h1>
            <p>Hỏi đáp tự nhiên về AQI, PM2.5, forecast và khuyến nghị sức khỏe</p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => handleDeleteConversation()}
            disabled={!activeConversationId}
          >
            Xóa hội thoại
          </button>
        </div>

        <div className="chatgpt-messages" ref={listRef}>
          {pageError ? (
            <EmptyState
              title="Không tải được dữ liệu hội thoại"
              description={pageError}
            />
          ) : detailLoading ? (
            <div className="chatgpt-history__empty">Đang tải nội dung hội thoại...</div>
          ) : emptyConversation ? (
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
          ) : (
            <>
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
                        {message.role === "user"
                          ? "Bạn"
                          : regeneratingMessageId === message.id
                          ? "AirSafeNet Assistant • Đang tạo lại"
                          : "AirSafeNet Assistant"}
                      </div>

                      <div className="chatgpt-message__content">
                        {message.role === "assistant" ? (
                          message.isStreaming ? (
                            <StreamingAssistantMessage content={message.content} />
                          ) : (
                            <AssistantMarkdown content={message.content} />
                          )
                        ) : (
                          message.content
                        )}
                      </div>

                      <div className="chatgpt-message__footer">
                        <span className="chatgpt-message__time">
                          {new Date(message.createdAt).toLocaleString("vi-VN")}
                        </span>

                        {message.role === "assistant" && !message.isStreaming ? (
                          <MessageActions
                            onCopy={() => handleCopy(message.content)}
                            onRegenerate={
                              message.sourceMessage ? () => handleRegenerate(message) : undefined
                            }
                            disableRegenerate={regeneratingMessageId === message.id}
                          />
                        ) : null}
                      </div>

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
            </>
          )}
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