interface EditRowButtonProps {
  label: string;
  onClick: () => void;
}

export function EditRowButton({ label, onClick }: EditRowButtonProps) {
  return (
    <button
      type="button"
      className="edit-row-btn"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
    >
      ✏️
    </button>
  );
}
