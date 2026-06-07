import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export interface ProfileField {
  label: string;
  value: ReactNode;
}

interface ProfileViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  loading?: boolean;
  profilePhotoUrl?: string | null;
  nationalIdFrontUrl?: string | null;
  nationalIdBackUrl?: string | null;
  fields: ProfileField[];
  onEdit?: () => void;
  uploads?: ReactNode;
}

function isPdf(url: string) {
  return url.toLowerCase().endsWith('.pdf');
}

function IdPreview({ label, url }: { label: string; url?: string | null }) {
  if (!url) {
    return (
      <div className="profile-id-card profile-id-missing">
        <span className="profile-id-label">{label}</span>
        <span className="profile-id-empty">Not uploaded</span>
      </div>
    );
  }

  if (isPdf(url)) {
    return (
      <div className="profile-id-card">
        <span className="profile-id-label">{label}</span>
        <a href={resolveMediaUrl(url)} target="_blank" rel="noreferrer" className="profile-id-link">
          Open PDF
        </a>
      </div>
    );
  }

  const mediaUrl = resolveMediaUrl(url);
  return (
    <div className="profile-id-card">
      <span className="profile-id-label">{label}</span>
      <a href={mediaUrl} target="_blank" rel="noreferrer" className="profile-id-image-link">
        <img src={mediaUrl} alt={label} className="profile-id-image" style={{ display: 'block' }} />
      </a>
    </div>
  );
}

export function ProfileViewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  loading = false,
  profilePhotoUrl,
  nationalIdFrontUrl,
  nationalIdBackUrl,
  fields,
  onEdit,
  uploads,
}: ProfileViewModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="modal-footer">
          {onEdit && (
            <Button variant="secondary" onClick={onEdit}>
              Edit profile
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-muted">Loading profile…</p>
      ) : (
        <div className="profile-view">
          {subtitle && <p className="profile-view-subtitle">{subtitle}</p>}

          <div className="profile-view-hero">
            {profilePhotoUrl ? (
              <img
                src={resolveMediaUrl(profilePhotoUrl, profilePhotoUrl)}
                alt=""
                className="profile-view-photo"
                style={{ display: 'block' }}
              />
            ) : (
              <span className="profile-view-photo profile-view-photo-empty" aria-hidden>
                👤
              </span>
            )}
            <div className="profile-view-id-grid">
              <IdPreview label="National ID — front" url={nationalIdFrontUrl} />
              <IdPreview label="National ID — back" url={nationalIdBackUrl} />
            </div>
          </div>

          {uploads}

          <dl className="profile-view-fields">
            {fields.map((field) => (
              <div key={field.label} className="profile-view-field">
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  );
}
