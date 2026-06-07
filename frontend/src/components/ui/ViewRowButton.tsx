interface ViewRowButtonProps {
  label: string;
  onClick: () => void;
}

export function ViewRowButton({ label, onClick }: ViewRowButtonProps) {
  return (
    <button
      type="button"
      className="view-row-btn"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
    >
      👁
    </button>
  );
}
