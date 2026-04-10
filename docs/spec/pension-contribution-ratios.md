# Pension contribution ratios (Payslip Gap 2)

For plugin wiring (`AnnotationFeature`, registry, red overlays), see [architecture.md](../architecture.md). This document describes **Gap 2** inside the shared [Payslip Gaps](payslip-gaps.md) feature.

## What it is

Israeli employers must meet **minimum pension contributions** relative to the **pensionable salary** shown on the payslip. This detector compares extracted amounts to the usual statutory floors:

- **Employer tagmulim (פנסיה / תגמולים):** at least **6.5%** of the pensionable base.
- **Employee pension deduction (ניכוי עובד):** at least **6%** of the same base.

When either ratio falls below those thresholds (with a small rounding tolerance), the tool logs a **Payslip gap** message and draws a **red** rectangle on the corresponding amount cell when `box_2d` is valid.

## Why it matters

Under-contribution directly reduces **long-term retirement savings** (compounding). The employer’s **6.5%** component also funds **disability coverage** (loss of work capacity) within the pension product; paying too little weakens that protection.

## Value to the employee

Clear, **explainable** flags tied to the slip: the employee sees which line looks wrong and gets console text they can take to payroll, HR, or union advice—without relying on manual arithmetic every month.

## How it works

1. **Extraction:** The main Gemini call fills `personal_header.pension_compliance` with three structured cells (see [Parent data](#parent-data-requirements) below). Each has `raw_text`, optional `amount_ils`, and `box_2d` on the **amount digits**.
2. **Detection:** [`pension-contribution-ratios.ts`](../../src/features/payslip-gaps/detectors/pension-contribution-ratios.ts) runs only when **all three** `amount_ils` values are present and the pensionable base is **&gt; 0**. It computes:

   - `employer_tagmulim / pensionable_salary`
   - `employee_pension_deduction / pensionable_salary` (absolute value if the slip prints deductions as negative)

3. **Thresholds:** Constants in [`constants.ts`](../../src/features/payslip-gaps/constants.ts): `MIN_EMPLOYER_TAGMUL_RATIO` (0.065), `MIN_EMPLOYEE_PENSION_RATIO` (0.06), `PENSION_RATIO_EPSILON` (1e-4).

4. **Annotation:** Separate stable ids `gap_pension_employer_ratio` and `gap_pension_employee_ratio` so both issues can be highlighted in one run. Color: `GAP_ANNOTATION_RED` (`#DC2626`).

There is **no** second-pass crop refinement for these boxes in v1 (unlike נ״ז). If overlays are often misaligned on your slips, consider the crop pattern in [bounding_boxes.md](../bounding_boxes.md).

## Parent data requirements

| Field | API path | Purpose |
|--------|-----------|--------|
| Pensionable base | `personal_header.pension_compliance.pensionable_salary` | Denominator — **שכר פנסיוני** or **שכר יסוד** as used for pension |
| Employer tagmulim | `...employer_tagmulim` | **פנסיה** / **תגמולים** under **הפרשות מעסיק** / **קופות גמל** — **not** קרן השתלמות; sum multiple lines into `amount_ils` |
| Employee pension deduction | `...employee_pension_deduction` | Pension line under **ניכויים** |

For each cell: **`amount_ils` must be omitted** when the model cannot parse a reliable NIS amount; the detector then **skips** the check (no false positive).

## Limitations (v1)

- **Employer pitzuyim (פיצויים, ~6%, often סעיף 14)** is **not** validated yet; only employer **tagmulim** vs base and employee **6%** vs base.
- If the slip shows a **legally wrong** pensionable cap but **ratios still look “fine”** against that printed base, this rule will not fire; catching that needs a cross-check (e.g. gross pay vs pensionable salary) and is out of scope for v1.
- **Collective agreements** or arrangements above statutory minima are not modeled; the tool only flags **below** the usual statutory floors.

## Detector implementation

[`../../src/features/payslip-gaps/detectors/pension-contribution-ratios.ts`](../../src/features/payslip-gaps/detectors/pension-contribution-ratios.ts)
