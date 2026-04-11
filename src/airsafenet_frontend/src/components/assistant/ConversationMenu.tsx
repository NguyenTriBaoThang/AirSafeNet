import { useEffect, useRef, useState } from "react";

type Props = {
  isPinned: boolean;
  onPinToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
};

export default function ConversationMenu({
  isPinned,
  onPinToggle,
  onRename,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="conversation-menu" ref={ref}>
      <button
        className="conversation-menu__trigger"
        onClick={() => setOpen((prev) => !prev)}
        title="Tùy chọn hội thoại"
        type="button"
      >
        ⋯
      </button>

      {open ? (
        <div className="conversation-menu__dropdown">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPinToggle();
            }}
          >
            {isPinned ? "Bỏ ghim" : "Ghim hội thoại"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
          >
            Đổi tên
          </button>

          <button
            type="button"
            className="danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            Xóa
          </button>
        </div>
      ) : null}
    </div>
  );
}