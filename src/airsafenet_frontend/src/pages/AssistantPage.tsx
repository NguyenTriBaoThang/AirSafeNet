import { useEffect, useMemo, useRef, useState } from "react";
import { sendAssistantMessageApi } from "../api/assistant";
import type { ChatMessage } from "../types/assistant";
import ChatBubble from "../components/assistant/ChatBubble";
import TypingBubble from "../components/assistant/TypingBubble";
import QuickSuggestions from "../components/assistant/QuickSuggestions";
import SectionHeader from "../components/common/SectionHeader";
import StatusChip from "../components/common/StatusChip";
import { useToast } from "../components/common/useToast";

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: makeId(),
      role: "assistant",
      content:
        "Xin chào, mình là trợ lý ảo AirSafeNet. Mình có thể giúp bạn giải thích AQI, PM2.5, dự báo chất lượng không khí và khuyến nghị sức khỏe liên quan.",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const { showToast } = useToast();
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend(text?: string) {
    const finalText = (text ?? input).trim();
    if (!finalText || loading) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: finalText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
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

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể gửi câu hỏi";
      showToast(message, "error");

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content:
            "Mình đang gặp sự cố khi xử lý câu hỏi này. Bạn thử lại sau một chút nhé.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSend();
  }

  return (
    <div className="assistant-page">
      <SectionHeader
        eyebrow="Trợ lý ảo AirSafeNet"
        title="Hỏi đáp tự nhiên về chất lượng không khí"
        description="Bạn có thể hỏi về AQI, PM2.5, thời điểm phù hợp để ra ngoài, hoặc khuyến nghị cho trẻ em, người cao tuổi và người có bệnh hô hấp."
        rightSlot={
          <StatusChip
            label={loading ? "Đang phản hồi..." : "Sẵn sàng hỗ trợ"}
            variant={loading ? "warning" : "success"}
          />
        }
      />

      <div className="assistant-layout">
        <div className="assistant-sidebar card interactive-card">
          <div className="assistant-sidebar__header">
            <h3>Gợi ý câu hỏi</h3>
            <p>Chọn nhanh để bắt đầu hội thoại</p>
          </div>

          <QuickSuggestions onSelect={handleSend} />

          <div className="assistant-sidebar__note">
            <h4>Phạm vi hỗ trợ</h4>
            <p>
              Trợ lý chỉ trả lời các câu hỏi liên quan đến chất lượng không khí,
              AQI/PM2.5, dự báo và khuyến nghị sức khỏe trong AirSafeNet.
            </p>
          </div>
        </div>

        <div className="assistant-chat card interactive-card">
          <div className="assistant-chat__header">
            <div className="assistant-chat__identity">
              <div className="chat-avatar chat-avatar--large">A</div>
              <div>
                <strong>Bác sĩ ảo AirSafeNet</strong>
                <p>Tư vấn theo dữ liệu dự báo và mô hình AI</p>
              </div>
            </div>
          </div>

          <div className="assistant-chat__messages" ref={listRef}>
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            {loading ? <TypingBubble /> : null}
          </div>

          <form className="assistant-chat__composer" onSubmit={handleSubmit}>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ví dụ: Chiều nay 5h cho con ra ngoài đá bóng có ổn không?"
            />

            <button className="btn btn-primary assistant-send-btn" disabled={!canSend}>
              Gửi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}