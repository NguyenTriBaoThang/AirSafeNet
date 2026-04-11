import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "../common/useToast";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Children, isValidElement, type ReactNode } from "react";

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

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }

  return "";
}

function tableToTsv(children: ReactNode): string {
  const rows: string[][] = [];

  Children.forEach(children, (section) => {
    if (!isValidElement<{ children?: ReactNode }>(section)) return;

    Children.forEach(section.props.children, (row) => {
      if (!isValidElement<{ children?: ReactNode }>(row)) return;

      const cells: string[] = [];
      Children.forEach(row.props.children, (cell) => {
        cells.push(extractText(cell).replace(/\s+/g, " ").trim());
      });

      if (cells.length > 0) {
        rows.push(cells);
      }
    });
  });

  return rows.map((r) => r.join("\t")).join("\n");
}

function MarkdownTable({ children }: { children?: ReactNode }) {
  const { showToast } = useToast();

  async function handleCopyTable() {
    try {
      const tsv = tableToTsv(children);
      await navigator.clipboard.writeText(tsv);
      showToast("Đã copy bảng", "success");
    } catch {
      showToast("Không thể copy bảng", "error");
    }
  }

  return (
    <div className="assistant-table-block">
      <div className="assistant-table-toolbar">
        <button
          type="button"
          className="assistant-table-toolbar__btn"
          onClick={handleCopyTable}
        >
          Copy table
        </button>
      </div>

      <div className="assistant-table-wrap">
        <table className="assistant-table">{children}</table>
      </div>
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
            return <MarkdownTable>{children}</MarkdownTable>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}