// Shrinks photos in the browser before they are uploaded, so a 6 MB phone
// photo is stored (and later served) as a roughly 0.5–1 MB image that is still
// sharp on large screens.
//
// It never blocks an upload: anything it cannot handle (GIF, SVG, unsupported
// formats, very old browsers, any error) is uploaded unchanged.

export const MAX_EDGE = 2400; // longest side in pixels
export const JPEG_QUALITY = 0.88;
const LEAVE_ALONE_BELOW_BYTES = 600 * 1024; // already small enough

/** Largest size that fits inside maxEdge while keeping the aspect ratio. */
export function fitWithin(width: number, height: number, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: scale < 1,
  };
}

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // Applies the camera's rotation so portrait photos are not saved sideways.
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      /* fall through to the <img> route */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export async function prepareImageForUpload(file: File): Promise<File> {
  try {
    if (typeof document === "undefined") return file;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

    const decoded = await decode(file);
    try {
      const { width, height, scaled } = fitWithin(decoded.width, decoded.height);
      if (!scaled && file.size <= LEAVE_ALONE_BELOW_BYTES) return file;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.imageSmoothingQuality = "high";
      context.fillStyle = "#ffffff"; // transparent areas become white in a JPEG
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
      if (!blob) return file;
      if (!scaled && blob.size >= file.size) return file; // no gain

      const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
      return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    } finally {
      decoded.release();
    }
  } catch {
    return file;
  }
}
