const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.82;

function toBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) resolve(blob);
        else reject(new Error(`Could not encode as ${mime}`));
      },
      mime,
      quality
    );
  });
}

/**
 * Downscales and re-encodes a raster image for web (smaller files, bounded dimensions).
 * Uses WebP when the browser supports encoding it; otherwise JPEG.
 */
export async function optimizeImageForWeb(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<Blob> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('This image format is not supported in the browser. Try PNG, JPEG, WebP, or GIF.');
  }

  try {
    let { width, height } = bitmap;
    const longest = Math.max(width, height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not available');

    if (scale < 1) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    try {
      return await toBlob(canvas, 'image/webp', quality);
    } catch {
      return await toBlob(canvas, 'image/jpeg', quality);
    }
  } finally {
    bitmap.close();
  }
}

export function extensionForOptimizedBlob(blob: Blob): string {
  if (blob.type === 'image/webp') return 'webp';
  return 'jpg';
}
