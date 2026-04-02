import type { AnalysisResult, AnnotationSpec } from "../../../types.js";
import {
  BASELINE_NEKUDOT_FEMALE,
  BASELINE_NEKUDOT_MALE,
  GAP_ANNOTATION_RED,
  GAP_ID_NEKUDOT_ZIKUI,
  NIS_PER_TAX_CREDIT_POINT_2026,
} from "../constants.js";

function validBox(box: number[]): box is [number, number, number, number] {
  return Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === "number");
}

/**
 * Detects missing or clearly sub-baseline נקודות זיכוי from extracted header data.
 * See docs/feature/payslip-gaps.md for rules and limitations.
 */
export function detectNekudotZikuiGap(analysis: AnalysisResult): {
  messages: string[];
  annotations: AnnotationSpec[];
} {
  const messages: string[] = [];
  const annotations: AnnotationSpec[] = [];

  const { tax_credit_points, employee_gender } = analysis.personal_header;
  const points = tax_credit_points.points;

  if (typeof points !== "number") {
    messages.push(
      "[Payslip gap: nekudot zikui] Skipped: numeric נקודות זיכוי not reliably parsed from slip.",
    );
    return { messages, annotations };
  }

  const box = tax_credit_points.box_2d;
  const canAnnotate = validBox(box);

  let gapMessage: string | null = null;
  let label: string | null = null;

  if (employee_gender === "male") {
    if (points === 0 || points < BASELINE_NEKUDOT_MALE) {
      gapMessage =
        `Tax credit points (${points}) are below the usual resident baseline (${BASELINE_NEKUDOT_MALE}) for male employees — income tax may be over-withheld (~${NIS_PER_TAX_CREDIT_POINT_2026} NIS per point per month).`;
      label = `נקודות זיכוי: ${points} (בעיה)`;
    }
  } else if (employee_gender === "female") {
    if (points === 0 || points < BASELINE_NEKUDOT_FEMALE) {
      gapMessage =
        points === 0
          ? `Tax credit points are zero; female employees typically have at least baseline ${BASELINE_NEKUDOT_FEMALE} — verify Form 101 / HR updates.`
          : `Tax credit points (${points}) are below the usual resident baseline (${BASELINE_NEKUDOT_FEMALE}) for female employees — income tax may be over-withheld (~${NIS_PER_TAX_CREDIT_POINT_2026} NIS per point per month).`;
      label = `נקודות זיכוי: ${points} (בעיה)`;
    }
  } else {
    // Gender not on slip: we cannot require the female baseline (2.75) without false positives for men
    // who may correctly have 2.25–2.74. Anything strictly below the male baseline (2.25) is suspicious
    // for a standard resident employee either way.
    if (points === 0) {
      gapMessage =
        `Tax credit points are zero; gender on slip is unknown — verify נקודות זיכוי and Form 101 with employer.`;
      label = `נקודות זיכוי: 0 (בדוק)`;
    } else if (points < BASELINE_NEKUDOT_MALE) {
      gapMessage =
        `Tax credit points (${points}) are below the typical minimum resident baseline (${BASELINE_NEKUDOT_MALE}; female baseline is ${BASELINE_NEKUDOT_FEMALE}). Gender not shown on slip — verify Form 101 and HR records (~${NIS_PER_TAX_CREDIT_POINT_2026} NIS per point per month).`;
      label = `נקודות זיכוי: ${points} (בדוק)`;
    }
  }

  if (gapMessage) {
    messages.push(`[Payslip gap: nekudot zikui] ${gapMessage}`);
    if (canAnnotate && label) {
      annotations.push({
        id: GAP_ID_NEKUDOT_ZIKUI,
        box_2d: box,
        strokeColor: GAP_ANNOTATION_RED,
        label,
      });
    } else if (!canAnnotate) {
      messages.push(
        "[Payslip gap: nekudot zikui] No valid box_2d for נקודות זיכוי — issue reported in console only.",
      );
    }
  }

  return { messages, annotations };
}
