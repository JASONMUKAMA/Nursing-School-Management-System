import { useState } from 'react';
import { ApiClientError } from '../../api/client';
import { studentsApi } from '../../api/endpoints';
import type { Student } from '../../types';
import { PhotoUploadField } from './PhotoUploadField';

type UploadField = 'photo' | 'idFront' | 'idBack';

interface StudentProfileUploadsProps {
  student: Student;
  onUpdated: (student: Student) => void;
}

export function StudentProfileUploads({ student, onUpdated }: StudentProfileUploadsProps) {
  const [uploadingField, setUploadingField] = useState<UploadField | null>(null);
  const [fieldStatus, setFieldStatus] = useState<Record<UploadField, { status: string; message: string }>>({
    photo: { status: 'idle', message: '' },
    idFront: { status: 'idle', message: '' },
    idBack: { status: 'idle', message: '' },
  });

  const upload = async (field: UploadField, file: File | null) => {
    if (!file) return;

    setUploadingField(field);
    setFieldStatus((prev) => ({
      ...prev,
      [field]: { status: 'uploading', message: 'Uploading…' },
    }));

    try {
      const updated =
        field === 'photo'
          ? await studentsApi.uploadProfilePhoto(student.id, file)
          : field === 'idFront'
            ? await studentsApi.uploadNationalIdFront(student.id, file)
            : await studentsApi.uploadNationalIdBack(student.id, file);
      onUpdated(updated);
      setFieldStatus((prev) => ({
        ...prev,
        [field]: { status: 'saved', message: 'Saved to server.' },
      }));
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Upload failed.';
      setFieldStatus((prev) => ({
        ...prev,
        [field]: { status: 'error', message },
      }));
    } finally {
      setUploadingField(null);
    }
  };

  return (
    <div className="profile-upload-panel">
      <p className="profile-upload-panel-title">Upload documents</p>
      <div className="photo-upload-row photo-upload-row-three">
        <PhotoUploadField
          label="Profile photo"
          hint="Select a file — uploads immediately."
          value={null}
          onChange={(file) => void upload('photo', file)}
          existingUrl={student.profilePhotoUrl}
          cacheBust={student.profilePhotoUrl ?? student.id}
          uploading={uploadingField === 'photo'}
          uploadStatus={
            fieldStatus.photo.status === 'uploading'
              ? 'uploading'
              : fieldStatus.photo.status === 'saved'
                ? 'saved'
                : fieldStatus.photo.status === 'error'
                  ? 'error'
                  : 'idle'
          }
          statusMessage={fieldStatus.photo.message || undefined}
        />
        <PhotoUploadField
          label="National ID — front"
          value={null}
          onChange={(file) => void upload('idFront', file)}
          acceptDocuments
          existingUrl={student.nationalIdFrontUrl}
          cacheBust={student.nationalIdFrontUrl ?? student.id}
          uploading={uploadingField === 'idFront'}
          uploadStatus={
            fieldStatus.idFront.status === 'uploading'
              ? 'uploading'
              : fieldStatus.idFront.status === 'saved'
                ? 'saved'
                : fieldStatus.idFront.status === 'error'
                  ? 'error'
                  : 'idle'
          }
          statusMessage={fieldStatus.idFront.message || undefined}
        />
        <PhotoUploadField
          label="National ID — back"
          value={null}
          onChange={(file) => void upload('idBack', file)}
          acceptDocuments
          existingUrl={student.nationalIdBackUrl}
          cacheBust={student.nationalIdBackUrl ?? student.id}
          uploading={uploadingField === 'idBack'}
          uploadStatus={
            fieldStatus.idBack.status === 'uploading'
              ? 'uploading'
              : fieldStatus.idBack.status === 'saved'
                ? 'saved'
                : fieldStatus.idBack.status === 'error'
                  ? 'error'
                  : 'idle'
          }
          statusMessage={fieldStatus.idBack.message || undefined}
        />
      </div>
    </div>
  );
}
