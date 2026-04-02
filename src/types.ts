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

export interface PersonalHeader {
  tax_credit_points: TaxCreditPointsField;
  employee_gender: EmployeeGender;
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
}
