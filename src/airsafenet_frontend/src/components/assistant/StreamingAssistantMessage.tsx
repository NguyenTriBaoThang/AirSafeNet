import { useEffect } from "react";
import AssistantMarkdown from "./AssistantMarkdown";
import { useTypewriter } from "../../hooks/useTypewriter";

type Props = {
  content: string;
  onDone?: () => void;
};

export default function StreamingAssistantMessage({
  content,
  onDone,
}: Props) {
  const { displayed, done } = useTypewriter(content, {
    enabled: true,
    speed: 16,
    chunkMin: 1,
    chunkMax: 3,
    onDone,
  });

  useEffect(() => {
    if (done) {
      onDone?.();
    }
  }, [done, onDone]);

  return (
    <div className="streaming-assistant">
      <AssistantMarkdown content={displayed} />
      {!done ? <span className="streaming-caret" /> : null}
    </div>
  );
}