import type { AnnotationFeature } from "./feature-types.js";
import { payslipGapsFeature } from "./payslip-gaps/index.js";

/** Register annotation features here (open for extension). */
export const annotationFeatures: AnnotationFeature[] = [payslipGapsFeature];
