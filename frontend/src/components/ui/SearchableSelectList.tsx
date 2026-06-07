import { createPortal } from 'react-dom';
import { useRef, type ReactNode, type RefObject } from 'react';
import { useDropdownPosition } from '../../hooks/useDropdownPosition';

interface SearchableSelectListProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  listId: string;
  listRef?: RefObject<HTMLUListElement | null>;
  repositionDeps?: unknown[];
  children: ReactNode;
}

/** Renders dropdown options in a portal with auto-adjusting fixed position (works inside modals). */
export function SearchableSelectList({
  open,
  anchorRef,
  listId,
  listRef: externalListRef,
  repositionDeps = [],
  children,
}: SearchableSelectListProps) {
  const internalListRef = useRef<HTMLUListElement>(null);
  const listRef = externalListRef ?? internalListRef;
  const listStyle = useDropdownPosition(open, anchorRef, repositionDeps);

  if (!open) return null;

  return createPortal(
    <ul
      ref={listRef}
      id={listId}
      className="searchable-select-list searchable-select-list-portal"
      role="listbox"
      style={listStyle}
    >
      {children}
    </ul>,
    document.body,
  );
}
