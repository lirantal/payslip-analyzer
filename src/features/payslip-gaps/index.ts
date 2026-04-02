import type { AnnotationFeature, AnnotationFeatureContext } from "../feature-types.js";
import type { AnnotationSpec } from "../../types.js";
import { detectNekudotZikuiGap } from "./detectors/nekudot-zikui.js";

const DETECTORS = [detectNekudotZikuiGap] as const;

export const payslipGapsFeature: AnnotationFeature = {
  id: "payslip_gaps",

  run(ctx: AnnotationFeatureContext): { annotations: AnnotationSpec[]; logLines: string[] } {
    const logLines: string[] = [];
    const annotations: AnnotationSpec[] = [];

    for (const detect of DETECTORS) {
      const { messages, annotations: ann } = detect(ctx.analysis);
      logLines.push(...messages);
      annotations.push(...ann);
    }

    return { annotations, logLines };
  },
};
