import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export interface PhotoUploadFieldProps {
  label: string;
  hint?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  acceptDocuments?: boolean;
  required?: boolean;
  existingUrl?: string | null;
}

function fileToPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function PhotoUploadField({
  label,
  hint,
  value,
  onChange,
  acceptDocuments = false,
  required = false,
  existingUrl = null,
}: PhotoUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (value) {
      const url = fileToPreviewUrl(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(resolveMediaUrl(existingUrl) ?? null);
    return undefined;
  }, [value, existingUrl]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setPendingStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Attach stream after the <video> element mounts (camera mode).
  useEffect(() => {
    if (mode !== 'camera' || !pendingStream || !videoRef.current) return;

    const video = videoRef.current;
    const stream = pendingStream;
    video.srcObject = stream;
    streamRef.current = stream;

    const markReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) setCameraReady(true);
    };

    video.addEventListener('loadedmetadata', markReady);
    void video.play().then(markReady).catch(() => {
      setCameraError('Could not start camera preview. Use file upload instead.');
    });

    return () => video.removeEventListener('loadedmetadata', markReady);
  }, [mode, pendingStream]);

  const handleFileChange = (file: File | null) => {
    if (!file) {
      onChange(null);
      return;
    }
    onChange(file);
    setMode('upload');
    stopCamera();
  };

  const startCamera = async () => {
    setCameraError('');
    stopCamera();
    setMode('camera');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setPendingStream(stream);
    } catch {
      setCameraError('Could not access camera. Use file upload instead.');
      setMode('upload');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Camera is not ready yet. Wait a moment and try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError('Capture failed. Try again or upload a file.');
          return;
        }
        const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onChange(file);
        stopCamera();
        setMode('upload');
      },
      'image/jpeg',
      0.92,
    );
  };

  const accept = acceptDocuments
    ? 'image/jpeg,image/png,image/webp,application/pdf'
    : 'image/jpeg,image/png,image/webp';

  const isImagePreview =
    (value?.type.startsWith('image/') ?? false) ||
    (!value && existingUrl != null && !existingUrl.toLowerCase().endsWith('.pdf'));

  return (
    <div className="photo-upload-field">
      <span className="photo-upload-label">
        {label}
        {required && <span className="photo-upload-required"> *</span>}
      </span>
      {hint && <span className="photo-upload-hint">{hint}</span>}

      <div className="photo-upload-tabs">
        <button
          type="button"
          className={`photo-upload-tab${mode === 'upload' ? ' active' : ''}`}
          onClick={() => {
            setMode('upload');
            stopCamera();
          }}
        >
          Upload file
        </button>
        {!acceptDocuments && (
          <button
            type="button"
            className={`photo-upload-tab${mode === 'camera' ? ' active' : ''}`}
            onClick={() => void startCamera()}
          >
            Use camera
          </button>
        )}
      </div>

      {mode === 'upload' && (
        <div className="photo-upload-dropzone">
          {previewUrl && isImagePreview ? (
            <img src={previewUrl} alt="" className="photo-upload-preview" />
          ) : value ? (
            <span className="photo-upload-filename">{value.name}</span>
          ) : existingUrl ? (
            <a href={resolveMediaUrl(existingUrl)} target="_blank" rel="noreferrer" className="photo-upload-link">
              View current file
            </a>
          ) : (
            <span className="photo-upload-placeholder">No file selected</span>
          )}
          <div className="photo-upload-actions">
            <button type="button" className="photo-upload-btn" onClick={() => fileInputRef.current?.click()}>
              Choose file
            </button>
            {value && (
              <button type="button" className="photo-upload-btn photo-upload-btn-muted" onClick={() => handleFileChange(null)}>
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="photo-upload-input"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </div>
      )}

      {mode === 'camera' && !acceptDocuments && (
        <div className="photo-upload-camera">
          {cameraError ? (
            <p className="photo-upload-error">{cameraError}</p>
          ) : (
            <>
              <video
                ref={videoRef}
                className="photo-upload-video"
                playsInline
                muted
                autoPlay
              />
              {!cameraReady && !cameraError && (
                <p className="photo-upload-loading">Starting camera…</p>
              )}
              <div className="photo-upload-actions">
                <button type="button" className="photo-upload-btn" onClick={capturePhoto} disabled={!cameraReady}>
                  Capture photo
                </button>
                <button
                  type="button"
                  className="photo-upload-btn photo-upload-btn-muted"
                  onClick={() => {
                    stopCamera();
                    setMode('upload');
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
