type Props = {
  title: string;
  description: string;
};

export default function EmptyState({ title, description }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">○</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}