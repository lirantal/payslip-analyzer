import type { AnnotationFeature, AnnotationFeatureContext } from '../feature-types'
import type { AnnotationSpec } from '../../types'
import { GAP_ID_NEKUDOT_ZIKUI } from './constants'
import { detectNekudotZikuiGap } from './detectors/nekudot-zikui'
import { detectPensionContributionRatiosGap } from './detectors/pension-contribution-ratios'
import { refineNekudotBoxOnRaster } from '../../refine-nekudot-box'

const DETECTORS = [detectNekudotZikuiGap, detectPensionContributionRatiosGap] as const

export const payslipGapsFeature: AnnotationFeature = {
  id: 'payslip_gaps',

  async run(ctx: AnnotationFeatureContext): Promise<{
    annotations: AnnotationSpec[]
    logLines: string[]
  }> {
    const logLines: string[] = []
    const annotations: AnnotationSpec[] = []

    for (const detect of DETECTORS) {
      const { messages, annotations: ann } = detect(ctx.analysis)
      logLines.push(...messages)
      annotations.push(...ann)
    }

    const nek = annotations.find((a) => a.id === GAP_ID_NEKUDOT_ZIKUI)
    if (nek) {
      const refined = await refineNekudotBoxOnRaster(nek.box_2d, {
        apiKey: ctx.geminiApiKey,
        rasterBytes: ctx.rasterBytes,
        rasterMimeType: ctx.rasterMimeType,
        disableRefine: ctx.disableNekudotRefine,
      })
      if (refined) {
        nek.box_2d = refined.box_2d
        logLines.push(
          '[Payslip gap: nekudot zikui] Applied crop-based box refinement (second Gemini pass).',
        )
      }
    }

    return { annotations, logLines }
  },
}
