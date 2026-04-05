type ToastType = "success" | "error" | "info";

type Props = {
  message: string;
  type: ToastType;
};

export default function Toast({ message, type }: Props) {
  return (
    <div className={`toast toast--${type}`}>
      <span>{message}</span>
    </div>
  );
}