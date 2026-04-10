type Props = {
  onCopy?: () => void;
  onRegenerate?: () => void;
};

export default function MessageActions({ onCopy, onRegenerate }: Props) {
  return (
    <div className="message-actions">
      {onCopy ? (
        <button type="button" className="message-actions__btn" onClick={onCopy}>
          Copy
        </button>
      ) : null}

      {onRegenerate ? (
        <button
          type="button"
          className="message-actions__btn"
          onClick={onRegenerate}
        >
          Regenerate
        </button>
      ) : null}
    </div>
  );
}