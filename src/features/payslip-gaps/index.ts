import type { AnnotationFeature, AnnotationFeatureContext } from "../feature-types.js";
import type { AnnotationSpec } from "../../types.js";
import { GAP_ID_NEKUDOT_ZIKUI } from "./constants.js";
import { detectNekudotZikuiGap } from "./detectors/nekudot-zikui.js";
import { detectPensionContributionRatiosGap } from "./detectors/pension-contribution-ratios.js";
import { refineNekudotBoxOnRaster } from "./refine-nekudot-box.js";

const DETECTORS = [detectNekudotZikuiGap, detectPensionContributionRatiosGap] as const;

export const payslipGapsFeature: AnnotationFeature = {
  id: "payslip_gaps",

  async run(ctx: AnnotationFeatureContext): Promise<{
    annotations: AnnotationSpec[];
    logLines: string[];
  }> {
    const logLines: string[] = [];
    const annotations: AnnotationSpec[] = [];

    for (const detect of DETECTORS) {
      const { messages, annotations: ann } = detect(ctx.analysis);
      logLines.push(...messages);
      annotations.push(...ann);
    }

    const nek = annotations.find((a) => a.id === GAP_ID_NEKUDOT_ZIKUI);
    if (nek) {
      const refined = await refineNekudotBoxOnRaster(ctx.rasterBuffer, nek.box_2d);
      if (refined) {
        nek.box_2d = refined.box_2d;
        logLines.push("[Payslip gap: nekudot zikui] Applied crop-based box refinement (second Gemini pass).");
      }
    }

    return { annotations, logLines };
  },
};
