type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
};

export default function SectionHeader({
  eyebrow,
  title,
  description,
  rightSlot,
}: Props) {
  return (
    <div className="section-header">
      <div className="section-header__left">
        {eyebrow ? <div className="section-header__eyebrow">{eyebrow}</div> : null}
        <h2 className="section-header__title">{title}</h2>
        {description ? (
          <p className="section-header__description">{description}</p>
        ) : null}
      </div>

      {rightSlot ? <div className="section-header__right">{rightSlot}</div> : null}
    </div>
  );
}