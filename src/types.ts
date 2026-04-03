/** One extracted financially significant field (raw data; not all are visually annotated). */
export interface Insight {
  category: string;
  label: string;
  value: string;
  box_2d: number[]; // [ymin, xmin, ymax, xmax] normalised 0-1000
  explanation: string;
}

export interface Summary {
  total_pension: string;
  total_keren_hishtalmut: string;
  total_expenses_reimbursed: string;
  net_pay: string;
  warnings: string[];
  tips: string[];
}

/** Header fields used by programmatic features (e.g. payslip gaps). */
export interface TaxCreditPointsField {
  /** Value as printed on the slip (e.g. "2.25", "0"). */
  raw_text: string;
  /**
   * Parsed nekudot zikui. Omit this property entirely if the value cannot be parsed reliably.
   * Use 0 only when the slip clearly shows zero points.
   */
  points?: number;
  box_2d: number[];
}

export type EmployeeGender = "male" | "female" | "unknown";

/** One monetary cell on the slip (pension compliance / payslip gaps). */
export interface PensionMoneyField {
  raw_text: string;
  /**
   * Parsed amount in NIS when clearly readable; omit if not reliably parseable.
   * If the slip splits employer pension across lines, use the sum for tagmulim.
   */
  amount_ils?: number;
  box_2d: number[];
}

/** Structured fields for statutory pension ratio checks (employer tagmulim vs base, employee vs base). */
export interface PensionCompliance {
  /** שכר פנסיוני / שכר יסוד — denominator for percentages. */
  pensionable_salary: PensionMoneyField;
  /** Employer pension to the fund: פנסיה / תגמולים in הפרשות מעסיק / קופות גמל (not קרן השתלמות). */
  employer_tagmulim: PensionMoneyField;
  /** Employee pension deduction from ניכויים. */
  employee_pension_deduction: PensionMoneyField;
}

export interface PersonalHeader {
  tax_credit_points: TaxCreditPointsField;
  employee_gender: EmployeeGender;
  pension_compliance: PensionCompliance;
}

export interface AnalysisResult {
  insights: Insight[];
  summary: Summary;
  personal_header: PersonalHeader;
}

/** Visual overlay from a feature (merged across features). */
export interface AnnotationSpec {
  /** Stable id for debugging (e.g. gap id). */
  id: string;
  box_2d: number[];
  strokeColor: string;
  /** Short label on the badge. */
  label: string;
  /**
   * When true, draw the caption below the rectangle first (avoids covering header text above the value).
   */
  preferLabelBelow?: boolean;
}
