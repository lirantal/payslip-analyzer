import sharp from "sharp";
import type { Box2d } from "../../box2d.js";
import { box2dToPixelRect, expandNormBox } from "../../box2d.js";
import {
  NEKUDOT_REFINE_SCHEMA,
  NEKUDOT_REFINE_SYSTEM,
  NEKUDOT_REFINE_USER,
  generateStructuredJsonFromImage,
} from "../../gemini-json.js";

const NORM_MARGIN = 85;
const PIXEL_PAD = 36;
const MIN_CROP_SIDE = 100;

/** When the coarse model box is useless, search this ROI (typical מצב משפחתי / lower-center). */
const DEFAULT_ROI_NORM: Box2d = [210, 70, 930, 970];

function validBox(box: number[]): box is Box2d {
  return Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === "number");
}

function localNormToGlobalNorm(
  local: Box2d,
  cropLeft: number,
  cropTop: number,
  cropW: number,
  cropH: number,
  fullW: number,
  fullH: number,
): Box2d {
  const [lymin, lxmin, lymax, lxmax] = local;
  const lx1 = Math.min(lxmin, lxmax);
  const lx2 = Math.max(lxmin, lxmax);
  const ly1 = Math.min(lymin, lymax);
  const ly2 = Math.max(lymin, lymax);
  const px1 = cropLeft + (lx1 / 1000) * cropW;
  const px2 = cropLeft + (lx2 / 1000) * cropW;
  const py1 = cropTop + (ly1 / 1000) * cropH;
  const py2 = cropTop + (ly2 / 1000) * cropH;
  return [
    (py1 / fullH) * 1000,
    (px1 / fullW) * 1000,
    (py2 / fullH) * 1000,
    (px2 / fullW) * 1000,
  ];
}

/**
 * Second Gemini pass on a cropped region: tighter box for נ״ז digits, mapped back to full-image 0–1000 coords.
 * Skipped when DISABLE_NEKUDOT_BOX_REFINE is set, or on error (caller keeps coarse box).
 */
export async function refineNekudotBoxOnRaster(
  rasterBuffer: Buffer,
  coarseBoxNorm: number[],
): Promise<{ box_2d: Box2d } | null> {
  if (process.env.DISABLE_NEKUDOT_BOX_REFINE === "1" || process.env.DISABLE_NEKUDOT_BOX_REFINE === "true") {
    return null;
  }

  const meta = await sharp(rasterBuffer).metadata();
  const fullW = meta.width!;
  const fullH = meta.height!;

  const basis: Box2d = validBox(coarseBoxNorm)
    ? expandNormBox(coarseBoxNorm as Box2d, NORM_MARGIN)
    : DEFAULT_ROI_NORM;

  let { x, y, width: cw, height: ch } = box2dToPixelRect(fullW, fullH, basis);
  x = Math.max(0, x - PIXEL_PAD);
  y = Math.max(0, y - PIXEL_PAD);
  cw = Math.min(fullW - x, cw + 2 * PIXEL_PAD);
  ch = Math.min(fullH - y, ch + 2 * PIXEL_PAD);
  cw = Math.max(MIN_CROP_SIDE, Math.round(cw));
  ch = Math.max(MIN_CROP_SIDE, Math.round(ch));

  if (x + cw > fullW) x = Math.max(0, fullW - cw);
  if (y + ch > fullH) y = Math.max(0, fullH - ch);

  const cropBuffer = await sharp(rasterBuffer).extract({ left: x, top: y, width: cw, height: ch }).png().toBuffer();
  const b64 = cropBuffer.toString("base64");

  console.log("Refining נ״ז box: second Gemini pass on image crop ...");

  let parsed: unknown;
  try {
    parsed = await generateStructuredJsonFromImage(b64, {
      systemInstruction: NEKUDOT_REFINE_SYSTEM,
      userPrompt: NEKUDOT_REFINE_USER,
      responseJsonSchema: NEKUDOT_REFINE_SCHEMA,
    });
  } catch {
    return null;
  }

  const o = parsed as { found?: boolean; box_2d?: number[] };
  if (!o.found || !validBox(o.box_2d ?? [])) {
    return null;
  }

  const local = o.box_2d as Box2d;
  const [lymin, lxmin, lymax, lxmax] = local;
  if (lymax - lymin < 2 && lxmax - lxmin < 2) {
    return null;
  }

  const global = localNormToGlobalNorm(local, x, y, cw, ch, fullW, fullH);
  return { box_2d: global };
}
