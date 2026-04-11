type Props = {
  updatedAt?: string | null;
  regeneratedCount?: number;
};

export default function MessageStatusBadges({
  updatedAt,
  regeneratedCount = 0,
}: Props) {
  const isEdited = !!updatedAt;
  const showRegenerated = regeneratedCount > 0;

  if (!isEdited && !showRegenerated) return null;

  return (
    <div className="message-status-badges">
      {isEdited ? (
        <span className="message-status-badge">
          đã chỉnh sửa
        </span>
      ) : null}

      {showRegenerated ? (
        <span className="message-status-badge message-status-badge--accent">
          Regenerated {regeneratedCount}x
        </span>
      ) : null}
    </div>
  );
}