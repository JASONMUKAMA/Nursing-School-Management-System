import type { IdCardData } from '../../utils/idCardPrint';
import { resolveMediaUrl } from '../../utils/mediaUrl';

const SCHOOL_NAME = 'Kampala School of Nursing';

interface IdCardTileProps {
  card: IdCardData;
  variant?: 'preview' | 'print';
}

export function IdCardTile({ card, variant = 'preview' }: IdCardTileProps) {
  const photo = resolveMediaUrl(card.photoUrl);
  const typeLabel = card.type === 'student' ? 'STUDENT ID' : 'STAFF ID';

  return (
    <article className={`id-card id-card-${variant}`}>
      <header className="id-card-header">
        <span className="id-card-school">{SCHOOL_NAME}</span>
        <span className="id-card-type">{typeLabel}</span>
      </header>
      <div className="id-card-body">
        {photo ? (
          <img src={photo} alt="" className="id-card-photo" />
        ) : (
          <div className="id-card-photo id-card-photo-empty" aria-hidden>
            👤
          </div>
        )}
        <div className="id-card-details">
          <p className="id-card-name">{card.fullName}</p>
          <p className="id-card-number">{card.idNumber}</p>
          <p className="id-card-subtitle">{card.subtitle}</p>
        </div>
      </div>
      <footer className="id-card-footer">NSMS · Nursing School Management System</footer>
    </article>
  );
}
