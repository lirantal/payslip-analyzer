import sharp from "sharp";
import type { AnnotationSpec } from "./types.js";
import { box2dToPixelRect } from "./box2d.js";

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
    const { x: x1, y: y1, width: boxW, height: boxH } = box2dToPixelRect(
      width,
      height,
      spec.box_2d as [number, number, number, number],
    );
    const color = spec.strokeColor;

    const labelText = escapeXml(spec.label);
    const fontSize = Math.max(12, Math.min(16, Math.round(height / 60)));
    const labelW = labelText.length * fontSize * 0.55 + 12;
    const labelH = fontSize + 10;

    let labelY: number;
    if (spec.preferLabelBelow) {
      labelY = y1 + boxH + 2;
      if (labelY + labelH > height) {
        labelY = Math.max(0, y1 - labelH - 2);
      }
    } else {
      labelY = y1 - labelH - 2 >= 0 ? y1 - labelH - 2 : y1 + boxH + 2;
    }
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

function validBox(box: number[]): box is [number, number, number, number] {
  return Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === "number");
}

/**
 * Composites feature-driven annotations onto the payslip raster.
 * `rasterBuffer` must be the same image that was sent to Gemini (see preparePayslipForPipeline).
 */
export async function annotateImage(
  rasterBuffer: Buffer,
  specs: AnnotationSpec[],
  outputPath: string,
): Promise<void> {
  const metadata = await sharp(rasterBuffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const validSpecs = specs.filter((s) => validBox(s.box_2d));

  if (validSpecs.length === 0) {
    console.log("No feature annotations to draw; saving raster copy without overlays.");
    await sharp(rasterBuffer).png().toFile(outputPath);
    console.log(`Image saved to ${outputPath}`);
    return;
  }

  const svgOverlay = buildAnnotationSvg(width, height, validSpecs);
  const svgBuffer = Buffer.from(svgOverlay);

  await sharp(rasterBuffer)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  console.log(`Annotated image saved to ${outputPath}`);
}
