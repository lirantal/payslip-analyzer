import type { Insight, TaxCreditPointsField } from '../../types'

export const TAX_CREDIT_BOX_TOP_REJECT_BELOW = 45

function validBox(box: number[]): box is [number, number, number, number] {
  return Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === 'number')
}

export function parsePayslipDecimal(value: string): number | undefined {
  const t = value.replace(/\s/g, '').replace(/,/g, '.')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : undefined
}

export function isNekudotZikuiInsight(insight: Insight): boolean {
  const compact = insight.label.replace(/\s/g, '')
  if (compact.includes('נקודות') && compact.includes('זיכוי')) return true
  if (compact.includes('נ״ז')) return true
  if (compact.includes('נ"ז')) return true
  if (/נ[״"\u05F4]ז/.test(compact)) return true
  return false
}

export function findNekudotZikuiInsight(insights: Insight[]): Insight | undefined {
  return insights.find(isNekudotZikuiInsight)
}

export function isSuspiciousTaxCreditBox(box: number[]): boolean {
  if (!validBox(box)) return true
  const [ymin, , ymax] = box
  const top = Math.min(ymin, ymax)
  return top < TAX_CREDIT_BOX_TOP_REJECT_BELOW
}

export interface ResolvedTaxCredit {
  points: number
  rawText: string
  box_2d: number[]
  reconciledBoxFromInsight: boolean
  reconciledPointsFromInsight: boolean
}

export function resolveTaxCreditForNekudot(
  tcp: TaxCreditPointsField,
  insights: Insight[],
): ResolvedTaxCredit | null {
  const insight = findNekudotZikuiInsight(insights)
  const personalPoints = tcp.points
  const insightPoints = insight ? parsePayslipDecimal(insight.value) : undefined

  let points: number | undefined = typeof personalPoints === 'number' ? personalPoints : undefined
  let rawText = tcp.raw_text
  let box = tcp.box_2d.slice()
  let reconciledBoxFromInsight = false
  let reconciledPointsFromInsight = false

  if (insight && insightPoints !== undefined) {
    if (points === undefined) {
      points = insightPoints
      rawText = insight.value
      reconciledPointsFromInsight = true
    } else if (points === 0 && insightPoints > 0) {
      points = insightPoints
      rawText = insight.value
      reconciledPointsFromInsight = true
    }
  }

  if (points === undefined) return null

  if (insight && validBox(insight.box_2d)) {
    const personalBoxOk = validBox(box) && !isSuspiciousTaxCreditBox(box)
    if (!personalBoxOk) {
      box = insight.box_2d.slice()
      reconciledBoxFromInsight = true
    }
  }

  return {
    points,
    rawText,
    box_2d: box,
    reconciledBoxFromInsight,
    reconciledPointsFromInsight,
  }
}

export function canAnnotateTaxCreditBox(box: number[]): boolean {
  return validBox(box) && !isSuspiciousTaxCreditBox(box)
}
