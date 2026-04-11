type Props = {
  onCopy?: () => void;
  onRegenerate?: () => void;
  disableCopy?: boolean;
  disableRegenerate?: boolean;
};

export default function MessageActions({
  onCopy,
  onRegenerate,
  disableCopy = false,
  disableRegenerate = false,
}: Props) {
  return (
    <div className="message-actions">
      {onCopy ? (
        <button
          type="button"
          className="message-actions__btn"
          onClick={onCopy}
          disabled={disableCopy}
        >
          Copy
        </button>
      ) : null}

      {onRegenerate ? (
        <button
          type="button"
          className="message-actions__btn"
          onClick={onRegenerate}
          disabled={disableRegenerate}
        >
          Regenerate
        </button>
      ) : null}
    </div>
  );
}