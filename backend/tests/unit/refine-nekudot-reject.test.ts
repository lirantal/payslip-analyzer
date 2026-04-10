import { describe, expect, it } from 'vitest'
import { NEKUDOT_REFINE_LOCAL_TOP_REJECT_MIN } from '../../src/payslip/refine-nekudot-box'

function localTopEdge(box: number[]): number {
  return Math.min(box[0], box[2])
}

describe('nekudot refine local top reject threshold', () => {
  it('rejects boxes anchored in the lower portion of the crop (e.g. % מס קבוע row)', () => {
    expect(localTopEdge([650, 10, 720, 400]) >= NEKUDOT_REFINE_LOCAL_TOP_REJECT_MIN).toBe(true)
  })

  it('accepts boxes in the upper/mid crop (typical נ״ז digits)', () => {
    expect(localTopEdge([180, 50, 240, 350]) >= NEKUDOT_REFINE_LOCAL_TOP_REJECT_MIN).toBe(false)
  })
})
