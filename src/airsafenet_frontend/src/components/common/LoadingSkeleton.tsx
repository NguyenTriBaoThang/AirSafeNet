type Props = {
  height?: number;
  rounded?: number;
};

export default function LoadingSkeleton({
  height = 20,
  rounded = 12,
}: Props) {
  return (
    <div
      className="loading-skeleton"
      style={{
        height: `${height}px`,
        borderRadius: `${rounded}px`,
      }}
    />
  );
}