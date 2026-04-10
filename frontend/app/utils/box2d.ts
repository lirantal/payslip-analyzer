/**
 * Gemini / Vertex convention: box_2d = [y_min, x_min, y_max, x_max], each in 0–1000, origin top-left.
 * Mirrors backend/src/payslip/box2d.ts
 */

export type Box2d = [number, number, number, number]

function clamp1000(n: number): number {
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1000, n))
}

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

export function box2dToPixelRect(width: number, height: number, box: Box2d): PixelRect {
  const [ymin, xmin, ymax, xmax] = box.map(clamp1000) as Box2d

  const xMinN = Math.min(xmin, xmax)
  const xMaxN = Math.max(xmin, xmax)
  const yMinN = Math.min(ymin, ymax)
  const yMaxN = Math.max(ymin, ymax)

  const x = Math.round((xMinN / 1000) * width)
  const y = Math.round((yMinN / 1000) * height)
  const x2 = Math.round((xMaxN / 1000) * width)
  const y2 = Math.round((yMaxN / 1000) * height)

  return {
    x,
    y,
    width: Math.max(1, x2 - x),
    height: Math.max(1, y2 - y)
  }
}

export function validBox(box: number[]): box is Box2d {
  return (
    box.length === 4
    && box.every(n => typeof n === 'number' && Number.isFinite(n))
  )
}
