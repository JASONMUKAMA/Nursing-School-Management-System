import { ZoomableImage } from './ZoomableImage';
import { resolveMediaUrl } from '../../utils/mediaUrl';

interface NationalIdDocCellProps {
  frontUrl?: string | null;
  backUrl?: string | null;
  cacheBust?: string | number;
  personName?: string;
}

function isPdf(url: string) {
  return url.toLowerCase().endsWith('.pdf');
}

function renderSide(
  side: 'Front' | 'Back',
  url: string | null | undefined,
  cacheBust: string | number | undefined,
  personName: string | undefined,
) {
  if (!url) {
    return <span className="badge badge-pending">{side}</span>;
  }

  const resolved = resolveMediaUrl(url, cacheBust);
  const label = personName
    ? `${personName} — National ID ${side.toLowerCase()}`
    : `National ID — ${side.toLowerCase()}`;

  if (resolved && !isPdf(url)) {
    return (
      <ZoomableImage src={resolved} zoomLabel={label} className="id-doc-badge-trigger">
        <span className="badge badge-active">{side}</span>
      </ZoomableImage>
    );
  }

  return (
    <a href={resolved} target="_blank" rel="noreferrer" className="id-doc-badge-link">
      <span className="badge badge-active">{side}</span>
    </a>
  );
}

export function NationalIdDocCell({
  frontUrl,
  backUrl,
  cacheBust,
  personName,
}: NationalIdDocCellProps) {
  return (
    <span className="id-doc-status">
      {renderSide('Front', frontUrl, cacheBust, personName)}
      {renderSide('Back', backUrl, cacheBust, personName)}
    </span>
  );
}
