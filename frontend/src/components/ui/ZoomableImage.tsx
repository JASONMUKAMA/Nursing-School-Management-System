import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
  zoomLabel?: string;
  children?: ReactNode;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

export function ZoomableImage({ src, alt = '', className, zoomLabel, children }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    resetView();
  }, [resetView]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  useEffect(() => {
    const el = viewportRef.current;
    if (!open || !el) return undefined;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setZoom((z) => {
        const next = clampZoom(Number((z + delta).toFixed(2)));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    viewportRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <>
      <button
        type="button"
        className={`zoomable-image-trigger${children ? ' zoomable-image-trigger-custom' : ''}${className ? ` ${className}` : ''}`}
        onClick={() => setOpen(true)}
        aria-label={zoomLabel ? `Zoom ${zoomLabel}` : 'Zoom image'}
        title="Click to zoom"
      >
        {children ?? (
          <>
            <img src={src} alt={alt} className="zoomable-image-thumb" style={{ display: 'block' }} />
            <span className="zoomable-image-hint" aria-hidden>
              🔍
            </span>
          </>
        )}
      </button>

      {open && (
        <div className="zoomable-image-overlay" onClick={close} role="presentation">
          <div
            className="zoomable-image-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={zoomLabel ?? 'Image preview'}
          >
            <div className="zoomable-image-toolbar">
              <span className="zoomable-image-title">{zoomLabel ?? 'Image preview'}</span>
              <div className="zoomable-image-controls">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setZoom((z) => clampZoom(Number((z - ZOOM_STEP).toFixed(2))))}
                  disabled={zoom <= MIN_ZOOM}
                  aria-label="Zoom out"
                >
                  −
                </Button>
                <span className="zoomable-image-level">{Math.round(zoom * 100)}%</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setZoom((z) => clampZoom(Number((z + ZOOM_STEP).toFixed(2))))}
                  disabled={zoom >= MAX_ZOOM}
                  aria-label="Zoom in"
                >
                  +
                </Button>
                <Button size="sm" variant="secondary" onClick={resetView}>
                  Reset
                </Button>
                <Button size="sm" onClick={close}>
                  Close
                </Button>
              </div>
            </div>
            <div
              ref={viewportRef}
              className="zoomable-image-viewport"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <img
                src={src}
                alt={alt}
                className="zoomable-image-full"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
                }}
                draggable={false}
                onClick={(e) => {
                  e.stopPropagation();
                  if (zoom < MAX_ZOOM) {
                    setZoom((z) => clampZoom(Number((z + ZOOM_STEP).toFixed(2))));
                  }
                }}
              />
            </div>
            <p className="zoomable-image-help text-muted">
              Scroll or use +/− to zoom. Drag to pan when zoomed in. Click image to zoom further.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
