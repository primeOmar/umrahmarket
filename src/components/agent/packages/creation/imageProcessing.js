// imageProcessing.js
// -----------------------------------------------------------------------------
// Normalizes package photos client-side, before upload, so R2 only ever
// receives images sized right for how they're actually used across the site:
//
//   - Package detail carousel  → full-bleed, often 1200-1800px wide on desktop
//   - Package card thumbnail   → small, ~200-400px wide grid tile
//
// The problem this solves: agents upload whatever their phone produces —
// anywhere from a 12MP/4-8MB original to an old screenshot or a photo lifted
// off WhatsApp at 400x300. Uploading raw:
//   - oversized photos  → slow uploads, slow page loads, and the browser has
//     to downscale a huge image on the fly for the thumbnail grid (wasted
//     bandwidth, occasional jank on slower connections/devices)
//   - undersized photos → look soft/pixelated once stretched to fill a
//     carousel slide or a large card, and there's no way to catch this after
//     the fact once it's already live on the package
//
// This module fixes both by re-encoding every photo to a single sensible
// resolution band client-side before it's ever uploaded:
//   - Longest edge capped at MAX_LONG_EDGE  → keeps carousel crisp on retina
//     without shipping unnecessarily large files
//   - Longest edge below MIN_LONG_EDGE      → flagged (not silently upscaled;
//     upscaling never improves quality, it just costs bandwidth) so the
//     agent gets a warning and can swap in a better photo
//   - EXIF orientation corrected            → phone photos that appear
//     sideways/upside-down in the raw file are normalized on the canvas, so
//     they're never mistakenly rotated in the carousel or thumbnail
//
// One processed file is used for BOTH the carousel and the thumbnail — the
// thumbnail grid crops it with CSS `object-cover` (already correct in
// HeroSection.jsx / package cards), and at MAX_LONG_EDGE it's plenty sharp
// for a full-width carousel slide too. No backend changes required — this
// still produces a plain `File`, uploaded exactly like today.
// -----------------------------------------------------------------------------

export const MAX_LONG_EDGE = 2000;      // cap for the carousel's largest display size
export const MIN_LONG_EDGE = 800;       // below this, flag as low-resolution
export const OUTPUT_TYPE = 'image/jpeg';
export const OUTPUT_QUALITY = 0.85;
export const MAX_OUTPUT_BYTES = 2_000_000; // soft target; we step quality down if needed

/**
 * processPackageImage(file) → Promise<{
 *   file: File,              // re-encoded, correctly-oriented, size-capped JPEG
 *   previewUrl: string,      // object URL for an instant local preview — caller must revokeObjectURL when done
 *   width: number,           // final output dimensions
 *   height: number,
 *   originalWidth: number,
 *   originalHeight: number,
 *   isLowRes: boolean,       // true if the source was smaller than MIN_LONG_EDGE
 *   originalBytes: number,
 *   processedBytes: number,
 * }>
 */
export async function processPackageImage(file) {
  const source = await loadOrientedImageSource(file);
  const originalWidth = source.width;
  const originalHeight = source.height;

  const longest = Math.max(originalWidth, originalHeight);
  const scale = longest > MAX_LONG_EDGE ? MAX_LONG_EDGE / longest : 1;
  const outW = Math.max(1, Math.round(originalWidth * scale));
  const outH = Math.max(1, Math.round(originalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, outW, outH);
  source.close?.(); // release ImageBitmap memory if applicable

  const blob = await encodeWithSizeBudget(canvas);
  const outFile = new File([blob], toJpegName(file.name), { type: OUTPUT_TYPE });

  return {
    file: outFile,
    previewUrl: URL.createObjectURL(blob),
    width: outW,
    height: outH,
    originalWidth,
    originalHeight,
    isLowRes: longest < MIN_LONG_EDGE,
    originalBytes: file.size,
    processedBytes: blob.size,
  };
}

/**
 * processPackageImages(files) → runs processPackageImage over a FileList/array,
 * preserving order, and never throws for the whole batch — a single bad file
 * is dropped (with a console warning) rather than failing every upload.
 */
export async function processPackageImages(files) {
  const settled = await Promise.allSettled(Array.from(files).map(processPackageImage));
  const results = [];
  let failedCount = 0;
  for (const s of settled) {
    if (s.status === 'fulfilled') results.push(s.value);
    else { failedCount += 1;  }
  }
  return { results, failedCount };
}

// ── internals ────────────────────────────────────────────────────────────────

// Re-encodes at OUTPUT_QUALITY first; if the result is still above the soft
// byte budget (large, highly-detailed photos), steps quality down a couple
// of times rather than shipping an oversized file.
async function encodeWithSizeBudget(canvas) {
  let quality = OUTPUT_QUALITY;
  for (let attempt = 0; attempt < 3; attempt++) {
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to encode image'))), OUTPUT_TYPE, quality)
    );
    if (blob.size <= MAX_OUTPUT_BYTES || attempt === 2) return blob;
    quality -= 0.12;
  }
}

// Uses createImageBitmap with imageOrientation:'from-image' where available
// (Chrome, Firefox, Safari 15.4+) so EXIF-rotated phone photos are drawn
// upright automatically. Falls back to a plain <img> for older browsers —
// slightly less reliable on orientation, but still correct in the vast
// majority of cases since most modern phones write upright pixel data.
async function loadOrientedImageSource(file) {
  if (typeof window.createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // fall through to <img> fallback below
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read image file'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toJpegName(name) {
  return (name || 'photo').replace(/\.\w+$/, '') + '.jpg';
}