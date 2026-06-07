import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { IdCardData } from '../../utils/idCardPrint';
import { MAX_CARDS_PER_PRINT } from '../../utils/idCardPrint';
import { Button } from '../ui/Button';
import { IdCardTile } from './IdCardTile';

const PREVIEW_LIMIT = 12;

interface IdCardPrintModalProps {
  cards: IdCardData[];
  title: string;
  onClose: () => void;
  onPrint: () => void;
}

export function IdCardPrintModal({ cards, title, onClose, onPrint }: IdCardPrintModalProps) {
  const previewCards = cards.slice(0, PREVIEW_LIMIT);
  const printCount = Math.min(cards.length, MAX_CARDS_PER_PRINT);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div className="modal-overlay id-card-print-modal" onClick={onClose} role="presentation">
      <div
        className="modal modal-lg id-card-print-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="id-print-title"
      >
        <div className="modal-header">
          <h3 id="id-print-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body id-card-print-body">
          <p className="id-card-print-count text-muted">
            {cards.length} card{cards.length === 1 ? '' : 's'} selected.
            {printCount < cards.length
              ? ` This print job will include the first ${printCount}.`
              : ' Click Print now to open the print preview.'}
          </p>
          <div className="id-card-print-grid">
            {previewCards.map((card, index) => (
              <IdCardTile key={`${card.type}-${card.idNumber}-${index}`} card={card} variant="print" />
            ))}
          </div>
          {cards.length > PREVIEW_LIMIT && (
            <p className="text-muted ids-hint">
              Showing {PREVIEW_LIMIT} of {cards.length} cards in preview.
            </p>
          )}
        </div>
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onPrint}>Print now ({printCount})</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
