import { assertSupportedMime, getMimeTypeFromFilename } from './mime'

export interface PreparedPayslip {
  geminiInline: { mimeType: string; data: string }
  rasterBytes: Uint8Array
  rasterMimeType: string
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function preparePayslipForPipeline(
  fileBytes: Uint8Array,
  originalFilename: string,
): Promise<PreparedPayslip> {
  const mimeType = getMimeTypeFromFilename(originalFilename)
  if (!mimeType) {
    throw new Error(`Unsupported or unknown file type for: ${originalFilename}`)
  }
  assertSupportedMime(mimeType)

  return {
    geminiInline: {
      mimeType,
      data: toBase64(fileBytes),
    },
    rasterBytes: fileBytes,
    rasterMimeType: mimeType,
  }
}
