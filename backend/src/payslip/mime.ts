/** API accepts raster images only (convert PDF to image on the client). */
const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

export function getMimeTypeFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase()
  const dot = lower.lastIndexOf('.')
  if (dot < 0) return null
  const ext = lower.slice(dot)
  return MIME_BY_EXT[ext] ?? null
}

export function assertSupportedMime(mime: string): void {
  const ok = Object.values(MIME_BY_EXT).includes(mime)
  if (!ok) {
    throw new Error(`Unsupported MIME type: ${mime}`)
  }
}
