import type { Complaint } from '../../types';

interface ComplaintAttachmentProps {
  complaint: Pick<Complaint, 'attachmentUrl' | 'attachmentFileName' | 'attachmentKind'>;
}

export function ComplaintAttachment({ complaint }: ComplaintAttachmentProps) {
  const { attachmentUrl, attachmentFileName, attachmentKind } = complaint;
  if (!attachmentUrl) return null;

  if (attachmentKind === 'Image') {
    return (
      <a
        className="complaint-attachment-image-link"
        href={attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          className="complaint-attachment-image"
          src={attachmentUrl}
          alt={attachmentFileName ?? 'Attached photo'}
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a
      className="complaint-attachment-pdf"
      href={attachmentUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="complaint-attachment-pdf-icon" aria-hidden>
        📄
      </span>
      <span className="complaint-attachment-pdf-meta">
        <strong>{attachmentFileName ?? 'Document.pdf'}</strong>
        <span>PDF · Tap to open</span>
      </span>
    </a>
  );
}
