type Props = {
  onSelect: (text: string) => void;
};

const suggestions = [
  "Chiều nay chất lượng không khí có ổn không?",
  "Trẻ em có nên ra ngoài lúc 5 giờ chiều không?",
  "PM2.5 hiện tại có đáng lo không?",
  "3 ngày tới có thời điểm nào không nên tập thể dục ngoài trời?",
  "Người có bệnh hô hấp nên lưu ý gì hôm nay?",
];

export default function QuickSuggestions({ onSelect }: Props) {
  return (
    <div className="quick-suggestions">
      {suggestions.map((item) => (
        <button
          key={item}
          type="button"
          className="quick-suggestion-chip"
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}