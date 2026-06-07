import { useEffect, type RefObject } from 'react';

/** Closes searchable select when clicking outside the control and portaled list. */
export function useSearchableSelectDismiss(
  open: boolean,
  rootRef: RefObject<HTMLElement | null>,
  listRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      onDismiss();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open, rootRef, listRef, onDismiss]);
}
