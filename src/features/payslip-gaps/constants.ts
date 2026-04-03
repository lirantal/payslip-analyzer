/** Statutory baseline nekudot zikui for Israeli residents (context: 2026). */
export const BASELINE_NEKUDOT_MALE = 2.25;
export const BASELINE_NEKUDOT_FEMALE = 2.75;

/** Monthly NIS value per tax credit point (2026). */
export const NIS_PER_TAX_CREDIT_POINT_2026 = 242;

/** Visual highlight for payslip gap issues. */
export const GAP_ANNOTATION_RED = "#DC2626";

export const GAP_ID_NEKUDOT_ZIKUI = "gap_nekudot_zikui";

/** Minimum employer tagmulim as a fraction of pensionable salary (6.5%). */
export const MIN_EMPLOYER_TAGMUL_RATIO = 0.065;
/** Minimum employee pension deduction as a fraction of pensionable salary (6%). */
export const MIN_EMPLOYEE_PENSION_RATIO = 0.06;
/** Tolerance for rounding when comparing ratios. */
export const PENSION_RATIO_EPSILON = 1e-4;

export const GAP_ID_PENSION_EMPLOYER_RATIO = "gap_pension_employer_ratio";
export const GAP_ID_PENSION_EMPLOYEE_RATIO = "gap_pension_employee_ratio";
