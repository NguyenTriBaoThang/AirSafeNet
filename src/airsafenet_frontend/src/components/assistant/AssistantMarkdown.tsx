import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "../common/useToast";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Props = {
  content: string;
};

function CodeBlock({
  inline,
  className,
  children,
}: {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const { showToast } = useToast();
  const raw = String(children ?? "").replace(/\n$/, "");
  const language = className?.replace("language-", "") || "text";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(raw);
      showToast("Đã copy code", "success");
    } catch {
      showToast("Không thể copy code", "error");
    }
  }

  if (inline) {
    return <code className="assistant-inline-code">{children}</code>;
  }

  return (
    <div className="assistant-codeblock">
      <div className="assistant-codeblock__header">
        <span className="assistant-codeblock__lang">{language}</span>
        <button
          type="button"
          className="assistant-codeblock__copy"
          onClick={handleCopy}
        >
          Copy code
        </button>
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers
        customStyle={{
          margin: 0,
          padding: "14px",
          background: "transparent",
          fontSize: "13px",
          lineHeight: "1.75",
          borderRadius: 0,
        }}
        codeTagProps={{
          style: {
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          },
        }}
        wrapLongLines
      >
        {raw}
      </SyntaxHighlighter>
    </div>
  );
}

function ParagraphWithCopy({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { showToast } = useToast();

  const text = Array.isArray(children)
    ? children.map((x) => (typeof x === "string" ? x : "")).join("")
    : typeof children === "string"
    ? children
    : "";

  async function handleCopy() {
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text.trim());
      showToast("Đã copy đoạn văn", "success");
    } catch {
      showToast("Không thể copy đoạn văn", "error");
    }
  }

  return (
    <div className="assistant-paragraph">
      <p>{children}</p>
      {text.trim() ? (
        <button
          type="button"
          className="assistant-paragraph__copy"
          onClick={handleCopy}
          title="Copy đoạn này"
        >
          Copy
        </button>
      ) : null}
    </div>
  );
}

export default function AssistantMarkdown({ content }: Props) {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const inline = !className; 

            return (
              <CodeBlock inline={inline} className={className}>
                {children}
              </CodeBlock>
            );
          },
          p({ children }) {
            return <ParagraphWithCopy>{children}</ParagraphWithCopy>;
          },
          table({ children }) {
            return (
              <div className="assistant-table-wrap">
                <table className="assistant-table">{children}</table>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}