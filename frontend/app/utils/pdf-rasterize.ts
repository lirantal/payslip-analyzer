import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

/** Match POC / backend docs: sharper digits for extraction and box_2d. */
export const PDF_PAGE_RENDER_SCALE = 3

let workerConfigured = false

function ensurePdfWorker(): void {
  if (workerConfigured) return
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
  workerConfigured = true
}

/**
 * Renders the first page of a PDF to a PNG file suitable for POST /api/payslip/analyze.
 * Must be called in the browser (uses canvas + pdf.js worker).
 */
export async function pdfFileToRasterPng(
  pdfFile: File,
  scale = PDF_PAGE_RENDER_SCALE
): Promise<File> {
  ensurePdfWorker()
  const data = new Uint8Array(await pdfFile.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({ data, verbosity: 0 })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context not available')
  }

  canvas.width = viewport.width
  canvas.height = viewport.height

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas
  }).promise

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Failed to encode PNG'))),
      'image/png'
    )
  })

  const baseName = pdfFile.name.replace(/\.pdf$/i, '') || 'payslip'
  return new File([blob], `${baseName}.png`, { type: 'image/png' })
}
