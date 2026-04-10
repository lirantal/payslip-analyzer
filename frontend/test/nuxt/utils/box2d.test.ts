import { describe, expect, it } from 'vitest'
import { box2dToPixelRect, validBox } from '~/utils/box2d'

describe('box2d', () => {
  it('validBox accepts four finite numbers', () => {
    expect(validBox([0, 0, 1000, 1000])).toBe(true)
    expect(validBox([])).toBe(false)
    expect(validBox([NaN, 0, 0, 0])).toBe(false)
  })

  it('box2dToPixelRect maps normalized coords to pixels', () => {
    const r = box2dToPixelRect(1000, 500, [0, 0, 500, 500])
    expect(r).toEqual({ x: 0, y: 0, width: 500, height: 250 })
  })

  it('box2dToPixelRect clamps and normalizes inverted corners', () => {
    const r = box2dToPixelRect(100, 100, [800, 800, 200, 200])
    expect(r.x).toBe(20)
    expect(r.y).toBe(20)
    expect(r.width).toBe(60)
    expect(r.height).toBe(60)
  })
})
