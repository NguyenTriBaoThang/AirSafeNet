import { useCallback, useMemo, useState, type ReactNode } from "react";
import Toast from "./Toast";
import { ToastContext, type ToastType } from "./toast-context";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type Props = {
  children: ReactNode;
};

export default function ToastProvider({ children }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-stack">
        {toasts.map((item) => (
          <Toast key={item.id} message={item.message} type={item.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}