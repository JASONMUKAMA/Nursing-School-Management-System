import { useRef, useState } from 'react';
import { classroomApi } from '../../api/endpoints';
import { Button } from '../ui/Button';
import { toast } from '../../utils/toast';
import type { LectureFile } from '../../types';

interface FilesPanelProps {
  sessionId: string;
  files: LectureFile[];
  canUpload: boolean;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function FilesPanel({ sessionId, files, canUpload }: FilesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChosen = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await classroomApi.uploadFile(sessionId, file);
      toast.success(`"${file.name}" shared with the class.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="classroom-panel">
      {canUpload && (
        <div className="classroom-upload">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={(e) => void handleFileChosen(e.target.files?.[0])}
          />
          <Button size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Uploading…' : 'Upload Lecture File'}
          </Button>
          <span className="text-muted">PDF or image, up to 10 MB</span>
        </div>
      )}

      {files.length === 0 ? (
        <p className="empty-state">No lecture files shared yet.</p>
      ) : (
        <ul className="classroom-file-list">
          {files.map((f) => (
            <li key={f.id} className="classroom-file-item">
              <a href={f.fileUrl} target="_blank" rel="noopener noreferrer" className="classroom-file-name">
                📎 {f.fileName}
              </a>
              <span className="text-muted">
                {formatSize(f.sizeBytes)} · {f.uploadedByName} · {new Date(f.createdAt).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
