import sharp from "sharp";
import type { AnnotationSpec } from "./types.js";
import { box2dToPixelRect } from "./box2d.js";

/** Minimum vertical gap between stacked label badges when their bounds intersect. */
const LABEL_STACK_VERTICAL_GAP = 6;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface LabelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function labelRect(labelX: number, labelY: number, labelW: number, labelH: number): LabelRect {
  return {
    left: labelX,
    top: labelY,
    right: labelX + labelW,
    bottom: labelY + labelH,
  };
}

function rectsOverlap2D(a: LabelRect, b: LabelRect): boolean {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

interface AnnotationLayout {
  spec: AnnotationSpec;
  x1: number;
  y1: number;
  boxW: number;
  boxH: number;
  labelX: number;
  initialLabelY: number;
  labelW: number;
  labelH: number;
  fontSize: number;
  color: string;
  labelTextEscaped: string;
}

function computeLayouts(width: number, height: number, specs: AnnotationSpec[]): AnnotationLayout[] {
  const layouts: AnnotationLayout[] = [];

  for (const spec of specs) {
    const { x: x1, y: y1, width: boxW, height: boxH } = box2dToPixelRect(
      width,
      height,
      spec.box_2d as [number, number, number, number],
    );
    const color = spec.strokeColor;

    const labelTextEscaped = escapeXml(spec.label);
    const fontSize = Math.max(12, Math.min(16, Math.round(height / 60)));
    const labelW = labelTextEscaped.length * fontSize * 0.55 + 12;
    const labelH = fontSize + 10;

    let initialLabelY: number;
    if (spec.preferLabelBelow) {
      initialLabelY = y1 + boxH + 2;
      if (initialLabelY + labelH > height) {
        initialLabelY = Math.max(0, y1 - labelH - 2);
      }
    } else {
      initialLabelY = y1 - labelH - 2 >= 0 ? y1 - labelH - 2 : y1 + boxH + 2;
    }
    const labelX = x1;

    layouts.push({
      spec,
      x1,
      y1,
      boxW,
      boxH,
      labelX,
      initialLabelY,
      labelW,
      labelH,
      fontSize,
      color,
      labelTextEscaped,
    });
  }

  return layouts;
}

/**
 * When multiple labels would overlap (e.g. adjacent table cells with the same baseline Y),
 * push labels down so badge rectangles stay separated by LABEL_STACK_VERTICAL_GAP.
 * Uses multiple passes so stacked labels settle; clamps to canvas height last per pass.
 */
function resolveStackedLabelYs(height: number, layouts: AnnotationLayout[]): number[] {
  const n = layouts.length;
  const finalY = layouts.map((l) => l.initialLabelY);

  for (let pass = 0; pass < Math.max(16, n * 8); pass++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let y = finalY[i];
      for (let iter = 0; iter < n * 6; iter++) {
        let maxY = y;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const rI = labelRect(layouts[i].labelX, y, layouts[i].labelW, layouts[i].labelH);
          const rJ = labelRect(layouts[j].labelX, finalY[j], layouts[j].labelW, layouts[j].labelH);
          if (rectsOverlap2D(rI, rJ)) {
            maxY = Math.max(maxY, finalY[j] + layouts[j].labelH + LABEL_STACK_VERTICAL_GAP);
          }
        }
        if (maxY <= y) break;
        y = maxY;
      }
      const clamped = Math.min(y, Math.max(0, height - layouts[i].labelH));
      if (clamped !== finalY[i]) changed = true;
      finalY[i] = clamped;
    }
    if (!changed) break;
  }

  return finalY;
}

export function buildAnnotationSvg(
  width: number,
  height: number,
  specs: AnnotationSpec[],
): string {
  const layouts = computeLayouts(width, height, specs);
  const finalLabelY = resolveStackedLabelYs(height, layouts);

  let rects = "";
  for (let idx = 0; idx < layouts.length; idx++) {
    const L = layouts[idx];
    const labelY = finalLabelY[idx];

    rects += `
      <rect x="${L.x1}" y="${L.y1}" width="${L.boxW}" height="${L.boxH}"
            fill="none" stroke="${L.color}" stroke-width="3" rx="2" />
      <rect x="${L.labelX}" y="${labelY}" width="${L.labelW}" height="${L.labelH}"
            fill="${L.color}" rx="3" opacity="0.9" />
      <text x="${L.labelX + 6}" y="${labelY + L.fontSize + 2}"
            font-family="Arial, Helvetica, sans-serif" font-size="${L.fontSize}"
            fill="white" font-weight="bold">${L.labelTextEscaped}</text>`;
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
