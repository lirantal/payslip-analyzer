import type { Box2d } from './box2d'
import { box2dToPixelRect, expandNormBox } from './box2d'
import {
  NEKUDOT_REFINE_SCHEMA,
  NEKUDOT_REFINE_SYSTEM,
  NEKUDOT_REFINE_USER,
  generateStructuredJsonFromImage,
} from './gemini-json'
import { extractRegionToPng, pngBytesToBase64, readBitmapSize } from './image-utils'

const NORM_MARGIN = 85
const PIXEL_PAD = 36
const MIN_CROP_SIDE = 100
/** Pull a bit of context above the coarse box so נ״ז row is not drowned by rows below. */
const REFINE_CROP_EXTEND_UP_FRAC = 0.014
const REFINE_CROP_EXTEND_UP_MAX_PX = 64
/** Downward extension: too much invites boxing % מס קבוע (row below נ״ז). */
const REFINE_CROP_EXTEND_DOWN_FRAC = 0.028
const REFINE_CROP_EXTEND_DOWN_MAX_PX = 120

/**
 * Second-pass model often misplaces the box on % מס קבוע (lower row). Those boxes sit low in crop-local
 * coordinates — discard and keep coarse. Exported for tests.
 */
export const NEKUDOT_REFINE_LOCAL_TOP_REJECT_MIN = 610

const DEFAULT_ROI_NORM: Box2d = [210, 70, 930, 970]

function validBox(box: number[]): box is Box2d {
  return Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === 'number')
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
  const [lymin, lxmin, lymax, lxmax] = local
  const lx1 = Math.min(lxmin, lxmax)
  const lx2 = Math.max(lxmin, lxmax)
  const ly1 = Math.min(lymin, lymax)
  const ly2 = Math.max(lymin, lymax)
  const px1 = cropLeft + (lx1 / 1000) * cropW
  const px2 = cropLeft + (lx2 / 1000) * cropW
  const py1 = cropTop + (ly1 / 1000) * cropH
  const py2 = cropTop + (ly2 / 1000) * cropH
  return [
    (py1 / fullH) * 1000,
    (px1 / fullW) * 1000,
    (py2 / fullH) * 1000,
    (px2 / fullW) * 1000,
  ]
}

export interface RefineNekudotOptions {
  apiKey: string
  rasterBytes: Uint8Array
  rasterMimeType: string
  disableRefine?: boolean
}

export async function refineNekudotBoxOnRaster(
  coarseBoxNorm: number[],
  opts: RefineNekudotOptions,
): Promise<{ box_2d: Box2d } | null> {
  if (opts.disableRefine) {
    return null
  }

  try {
    const { w: fullW, h: fullH } = await readBitmapSize(opts.rasterBytes, opts.rasterMimeType)
    if (fullW <= 0 || fullH <= 0) {
      return null
    }

    const basis: Box2d = validBox(coarseBoxNorm)
      ? expandNormBox(coarseBoxNorm as Box2d, NORM_MARGIN)
      : DEFAULT_ROI_NORM

    let { x, y, width: cw, height: ch } = box2dToPixelRect(fullW, fullH, basis)
    x = Math.max(0, x - PIXEL_PAD)
    y = Math.max(0, y - PIXEL_PAD)
    cw = Math.min(fullW - x, cw + 2 * PIXEL_PAD)
    ch = Math.min(fullH - y, ch + 2 * PIXEL_PAD)
    cw = Math.max(MIN_CROP_SIDE, Math.round(cw))
    ch = Math.max(MIN_CROP_SIDE, Math.round(ch))

    const extendUp = Math.min(
      REFINE_CROP_EXTEND_UP_MAX_PX,
      Math.round(fullH * REFINE_CROP_EXTEND_UP_FRAC),
    )
    y = Math.max(0, y - extendUp)
    ch = Math.min(fullH - y, ch + extendUp)

    const extendDown = Math.min(
      REFINE_CROP_EXTEND_DOWN_MAX_PX,
      Math.round(fullH * REFINE_CROP_EXTEND_DOWN_FRAC),
    )
    ch = Math.min(fullH - y, ch + extendDown)

    if (x + cw > fullW) x = Math.max(0, fullW - cw)
    if (y + ch > fullH) y = Math.max(0, fullH - ch)

    const cropBuffer = await extractRegionToPng(opts.rasterBytes, opts.rasterMimeType, x, y, cw, ch)
    const b64 = pngBytesToBase64(cropBuffer)

    let parsed: unknown
    try {
      parsed = await generateStructuredJsonFromImage(opts.apiKey, b64, {
        systemInstruction: NEKUDOT_REFINE_SYSTEM,
        userPrompt: NEKUDOT_REFINE_USER,
        responseJsonSchema: NEKUDOT_REFINE_SCHEMA,
      })
    } catch {
      return null
    }

    const o = parsed as { found?: boolean; box_2d?: number[] }
    if (!o.found || !validBox(o.box_2d ?? [])) {
      return null
    }

    const local = o.box_2d as Box2d
    const [lymin, lxmin, lymax, lxmax] = local
    if (lymax - lymin < 2 && lxmax - lxmin < 2) {
      return null
    }

    const localTop = Math.min(lymin, lymax)
    if (localTop >= NEKUDOT_REFINE_LOCAL_TOP_REJECT_MIN) {
      return null
    }

    const global = localNormToGlobalNorm(local, x, y, cw, ch, fullW, fullH)
    return { box_2d: global }
  } catch {
    return null
  }
}
