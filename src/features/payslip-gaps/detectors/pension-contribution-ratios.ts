import type { AnalysisResult, AnnotationSpec, PensionMoneyField } from "../../../types.js";
import {
  GAP_ANNOTATION_RED,
  GAP_ID_PENSION_EMPLOYEE_RATIO,
  GAP_ID_PENSION_EMPLOYER_RATIO,
  MIN_EMPLOYEE_PENSION_RATIO,
  MIN_EMPLOYER_TAGMUL_RATIO,
  PENSION_RATIO_EPSILON,
} from "../constants.js";

function validBox(box: number[]): box is [number, number, number, number] {
  return Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === "number");
}

function canAnnotate(field: PensionMoneyField): boolean {
  return validBox(field.box_2d);
}

/**
 * Detects employer tagmulim or employee pension below statutory minimums vs pensionable base.
 * See docs/feature/pension-contribution-ratios.md.
 */
export function detectPensionContributionRatiosGap(analysis: AnalysisResult): {
  messages: string[];
  annotations: AnnotationSpec[];
} {
  const messages: string[] = [];
  const annotations: AnnotationSpec[] = [];
  const pc = analysis.personal_header.pension_compliance;

  const baseAmount = pc.pensionable_salary.amount_ils;
  const employerAmount = pc.employer_tagmulim.amount_ils;
  const employeeAmount = pc.employee_pension_deduction.amount_ils;

  if (
    typeof baseAmount !== "number" ||
    !Number.isFinite(baseAmount) ||
    baseAmount <= 0 ||
    typeof employerAmount !== "number" ||
    !Number.isFinite(employerAmount) ||
    typeof employeeAmount !== "number" ||
    !Number.isFinite(employeeAmount)
  ) {
    messages.push(
      "[Payslip gap: pension ratios] Skipped: pensionable base and/or pension amounts not reliably parsed (amount_ils missing or invalid).",
    );
    return { messages, annotations };
  }

  const employerAbs = Math.abs(employerAmount);
  const employeeAbs = Math.abs(employeeAmount);
  const employerRatio = employerAbs / baseAmount;
  const employeeRatio = employeeAbs / baseAmount;

  const employerShort =
    employerRatio < MIN_EMPLOYER_TAGMUL_RATIO - PENSION_RATIO_EPSILON;
  const employeeShort =
    employeeRatio < MIN_EMPLOYEE_PENSION_RATIO - PENSION_RATIO_EPSILON;

  if (!employerShort && !employeeShort) {
    return { messages, annotations };
  }

  const pct = (r: number) => `${(r * 100).toFixed(2)}%`;

  if (employerShort) {
    const msg = `Employer pension (tagmulim) is ${pct(employerRatio)} of pensionable salary — below the statutory minimum (~${(MIN_EMPLOYER_TAGMUL_RATIO * 100).toFixed(1)}%). This reduces retirement savings and may underfund disability coverage within the employer component.`;
    messages.push(`[Payslip gap: pension ratios] ${msg}`);
    if (canAnnotate(pc.employer_tagmulim)) {
      annotations.push({
        id: GAP_ID_PENSION_EMPLOYER_RATIO,
        box_2d: pc.employer_tagmulim.box_2d,
        strokeColor: GAP_ANNOTATION_RED,
        label: `תגמולים מעסיק ${pct(employerRatio)} (בעיה)`,
      });
    } else {
      messages.push(
        "[Payslip gap: pension ratios] Employer ratio gap: no valid box for annotation (console-only).",
      );
    }
  }

  if (employeeShort) {
    const msg = `Employee pension deduction is ${pct(employeeRatio)} of pensionable salary — below the usual statutory minimum (~${(MIN_EMPLOYEE_PENSION_RATIO * 100).toFixed(0)}%).`;
    messages.push(`[Payslip gap: pension ratios] ${msg}`);
    if (canAnnotate(pc.employee_pension_deduction)) {
      annotations.push({
        id: GAP_ID_PENSION_EMPLOYEE_RATIO,
        box_2d: pc.employee_pension_deduction.box_2d,
        strokeColor: GAP_ANNOTATION_RED,
        label: `ניכוי פנסיה ${pct(employeeRatio)} (בעיה)`,
      });
    } else {
      messages.push(
        "[Payslip gap: pension ratios] Employee ratio gap: no valid box for annotation (console-only).",
      );
    }
  }

  return { messages, annotations };
}
