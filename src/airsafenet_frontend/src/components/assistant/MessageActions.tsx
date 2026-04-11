type Props = {
  onCopy?: () => void;
  onRegenerate?: () => void;
  onExportTxt?: () => void;
  onExportMd?: () => void;
  onShare?: () => void;
  disableCopy?: boolean;
  disableRegenerate?: boolean;
};

export default function MessageActions({
  onCopy,
  onRegenerate,
  onExportTxt,
  onExportMd,
  onShare,
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

      {onShare ? (
        <button
          type="button"
          className="message-actions__btn"
          onClick={onShare}
        >
          Share
        </button>
      ) : null}

      {onExportTxt ? (
        <button
          type="button"
          className="message-actions__btn"
          onClick={onExportTxt}
        >
          Export txt
        </button>
      ) : null}

      {onExportMd ? (
        <button
          type="button"
          className="message-actions__btn"
          onClick={onExportMd}
        >
          Export md
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