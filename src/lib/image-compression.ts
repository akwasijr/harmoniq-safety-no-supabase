/**
 * Client-side image compression using canvas.
 * Resizes large images and converts to JPEG at controlled quality.
 */

const MAX_DIMENSION = 1200; // px — longest side
const JPEG_QUALITY = 0.7;  // 0-1 scale
const MAX_COMPRESSED_SIZE = 300 * 1024; // 300KB target

/**
 * Compress an image file to a smaller JPEG data URL.
 * Returns the original if already small enough or not an image.
 */
export async function compressImage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image")) return dataUrl;

  // Skip if already small
  const sizeKB = (dataUrl.length * 3) / 4 / 1024;
  if (sizeKB <= 100) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if larger than MAX_DIMENSION
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try JPEG at target quality
      let compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

      // If still too large, reduce quality further
      if (compressed.length > MAX_COMPRESSED_SIZE * 1.33) {
        compressed = canvas.toDataURL("image/jpeg", 0.5);
      }
      if (compressed.length > MAX_COMPRESSED_SIZE * 1.33) {
        compressed = canvas.toDataURL("image/jpeg", 0.3);
      }

      resolve(compressed);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Compress all images in a media_urls array.
 */
export async function compressMediaUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(compressImage));
}
