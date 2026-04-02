import * as fs from "fs";
import { createCanvas, type Canvas } from "canvas";
import sharp from "sharp";
import { getMimeType } from "./mime.js";
import type { AnnotationSpec } from "./types.js";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildAnnotationSvg(
  width: number,
  height: number,
  specs: AnnotationSpec[],
): string {
  let rects = "";

  for (const spec of specs) {
    const [ymin, xmin, ymax, xmax] = spec.box_2d;
    const x1 = Math.round((xmin / 1000) * width);
    const y1 = Math.round((ymin / 1000) * height);
    const x2 = Math.round((xmax / 1000) * width);
    const y2 = Math.round((ymax / 1000) * height);

    const boxW = x2 - x1;
    const boxH = y2 - y1;
    const color = spec.strokeColor;

    const labelText = escapeXml(spec.label);
    const fontSize = Math.max(12, Math.min(16, Math.round(height / 60)));
    const labelW = labelText.length * fontSize * 0.55 + 12;
    const labelH = fontSize + 10;

    const labelY = y1 - labelH - 2 >= 0 ? y1 - labelH - 2 : y2 + 2;
    const labelX = x1;

    rects += `
      <rect x="${x1}" y="${y1}" width="${boxW}" height="${boxH}"
            fill="none" stroke="${color}" stroke-width="3" rx="2" />
      <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}"
            fill="${color}" rx="3" opacity="0.9" />
      <text x="${labelX + 6}" y="${labelY + fontSize + 2}"
            font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
            fill="white" font-weight="bold">${labelText}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects}</svg>`;
}

async function renderPdfToBuffer(pdfPath: string): Promise<Buffer> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);

  const scale = 2.0;
  const viewport = page.getViewport({ scale });
  const canvas: Canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  await doc.destroy();
  return canvas.toBuffer("image/png");
}

function validBox(box: number[]): box is [number, number, number, number] {
  return Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === "number");
}

/**
 * Composites feature-driven annotations onto the payslip image.
 * When there are no valid specs, writes the raster image unchanged.
 */
export async function annotateImage(
  inputPath: string,
  specs: AnnotationSpec[],
  outputPath: string,
): Promise<void> {
  const mimeType = getMimeType(inputPath);

  let imageBuffer: Buffer;
  if (mimeType === "application/pdf") {
    console.log("Rendering PDF first page to PNG for annotation ...");
    imageBuffer = await renderPdfToBuffer(inputPath);
  } else {
    imageBuffer = fs.readFileSync(inputPath) as unknown as Buffer;
  }

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const validSpecs = specs.filter((s) => validBox(s.box_2d));

  if (validSpecs.length === 0) {
    console.log("No feature annotations to draw; saving raster copy without overlays.");
    await sharp(imageBuffer).png().toFile(outputPath);
    console.log(`Image saved to ${outputPath}`);
    return;
  }

  const svgOverlay = buildAnnotationSvg(width, height, validSpecs);
  const svgBuffer = Buffer.from(svgOverlay);

  await sharp(imageBuffer)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  console.log(`Annotated image saved to ${outputPath}`);
}
