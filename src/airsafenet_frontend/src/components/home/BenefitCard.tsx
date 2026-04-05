type Props = {
  title: string;
  description: string;
};

export default function BenefitCard({ title, description }: Props) {
  return (
    <div className="benefit-card">
      <div className="benefit-card__icon">✦</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}