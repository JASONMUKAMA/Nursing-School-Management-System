import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

const DEFAULT_MAX_HEIGHT = 220;

function getScrollParents(element: HTMLElement): (HTMLElement | Window)[] {
  const parents: (HTMLElement | Window)[] = [window];
  let node: HTMLElement | null = element.parentElement;

  while (node) {
    const { overflow, overflowY, overflowX } = getComputedStyle(node);
    const scrollable = [overflow, overflowY, overflowX].some((value) =>
      /auto|scroll|overlay/.test(value),
    );
    if (scrollable) parents.push(node);
    node = node.parentElement;
  }

  return parents;
}

/** Positions a dropdown with fixed coordinates; repositions on scroll/resize inside modals. */
export function useDropdownPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  deps: unknown[] = [],
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const el = anchorRef.current;

    const update = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 8;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUp = spaceBelow < 96 && spaceAbove > spaceBelow + 48;
      const available = openUp ? spaceAbove - 4 : spaceBelow - 4;
      const maxHeight = Math.max(80, Math.min(DEFAULT_MAX_HEIGHT, available));

      setStyle({
        position: 'fixed',
        top: openUp ? Math.max(viewportPadding, rect.top - maxHeight - 4) : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight,
        zIndex: 1200,
      });
    };

    update();

    const scrollParents = getScrollParents(el);
    scrollParents.forEach((parent) => parent.addEventListener('scroll', update, { passive: true }));
    window.addEventListener('resize', update);

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(el);
    const modal = el.closest('.modal');
    if (modal instanceof HTMLElement) observer?.observe(modal);

    return () => {
      scrollParents.forEach((parent) => parent.removeEventListener('scroll', update));
      window.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [open, anchorRef, ...deps]);

  return style;
}
