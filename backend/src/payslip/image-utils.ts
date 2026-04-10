/** PNG IHDR width/height (big-endian) when `createImageBitmap` is unavailable (e.g. some Workers). */
function readPngIhdrDimensions(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length < 24) return null
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) return null
  const w = (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]
  const h = (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  return { w, h }
}

export async function readBitmapSize(bytes: Uint8Array, mimeType: string): Promise<{ w: number; h: number }> {
  const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: mimeType }))
  try {
    return { w: bmp.width, h: bmp.height }
  } finally {
    bmp.close()
  }
}

/** Prefer `createImageBitmap`; fall back to PNG header parse; last resort 0×0. */
export async function readBitmapSizeWithFallback(
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ w: number; h: number }> {
  try {
    return await readBitmapSize(bytes, mimeType)
  } catch {
    if (mimeType === 'image/png') {
      const d = readPngIhdrDimensions(bytes)
      if (d) return d
    }
    return { w: 0, h: 0 }
  }
}

export async function extractRegionToPng(
  bytes: Uint8Array,
  mimeType: string,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): Promise<Uint8Array> {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas is not available')
  }
  const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: mimeType }))
  try {
    const off = new OffscreenCanvas(sw, sh)
    const ctx = off.getContext('2d')
    if (!ctx) throw new Error('2d context')
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh)
    const blob = await off.convertToBlob({ type: 'image/png' })
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    bmp.close()
  }
}

function uint8ArrayToBase64(u8: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function pngBytesToBase64(png: Uint8Array): string {
  return uint8ArrayToBase64(png)
}
