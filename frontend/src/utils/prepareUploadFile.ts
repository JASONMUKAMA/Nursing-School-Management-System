/** Ensure uploads have a valid filename extension for the API. */
function withExtension(file: File, ext: string): File {
  const base = file.name?.replace(/\.[^.]+$/, '') || 'upload';
  const name = `${base}${ext.startsWith('.') ? ext : `.${ext}`}`;
  return new File([file], name, { type: file.type || 'application/octet-stream' });
}

function extensionFromMime(type: string): string | null {
  switch (type.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/heic':
    case 'image/heif':
      return '.heic';
    case 'application/pdf':
      return '.pdf';
    default:
      return null;
  }
}

/** Convert phone/camera images to JPEG so the server always accepts them. */
async function imageToJpeg(file: File): Promise<File | null> {
  if (file.type === 'application/pdf') return null;

  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('decode failed'));
        el.src = url;
      });

      const maxSide = 1600;
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        const scale = maxSide / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      if (!blob) return null;

      return new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

/** Normalize a file before multipart upload (extension, HEIC/phone photos → JPEG). */
export async function prepareUploadFile(file: File): Promise<File> {
  if (file.type.startsWith('image/') && file.type !== 'image/gif') {
    const jpeg = await imageToJpeg(file);
    if (jpeg) return jpeg;
  }

  const ext = extensionFromMime(file.type);
  if (ext && !/\.\w+$/i.test(file.name)) {
    return withExtension(file, ext);
  }

  return file;
}
