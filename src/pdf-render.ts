import * as fs from "fs";
import { createCanvas, type Canvas } from "canvas";

/** Higher scale improves small Hebrew text / numbers for extraction and box accuracy. */
export const PDF_PAGE_RENDER_SCALE = 3.0;

export async function renderPdfPageToPngBuffer(pdfPath: string): Promise<Buffer> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);

  const viewport = page.getViewport({ scale: PDF_PAGE_RENDER_SCALE });
  const canvas: Canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  await doc.destroy();
  return canvas.toBuffer("image/png");
}
