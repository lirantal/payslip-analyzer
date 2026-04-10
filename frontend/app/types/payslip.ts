/** Mirrors backend `src/payslip/types.ts` + top-level `recordId` from the analyze route. */

export interface Insight {
  category: string
  label: string
  value: string
  box_2d: number[]
  explanation: string
}

export interface PayslipSummary {
  total_pension: string
  total_keren_hishtalmut: string
  total_expenses_reimbursed: string
  net_pay: string
  warnings: string[]
  tips: string[]
}

export interface TaxCreditPointsField {
  raw_text: string
  points?: number
  box_2d: number[]
}

export type EmployeeGender = 'male' | 'female' | 'unknown'

export interface PensionMoneyField {
  raw_text: string
  amount_ils?: number
  box_2d: number[]
}

export interface PensionCompliance {
  pensionable_salary: PensionMoneyField
  employer_tagmulim: PensionMoneyField
  employee_pension_deduction: PensionMoneyField
}

export interface PersonalHeader {
  tax_credit_points: TaxCreditPointsField
  employee_gender: EmployeeGender
  pension_compliance: PensionCompliance
}

export interface AnalysisResult {
  insights: Insight[]
  summary: PayslipSummary
  personal_header: PersonalHeader
}

export interface AnnotationSpec {
  id: string
  box_2d: number[]
  strokeColor: string
  label: string
  preferLabelBelow?: boolean
}

export interface PayslipAnalyzeMeta {
  originalFilename: string
  mimeType: string
  rasterMimeType: string
  width: number
  height: number
}

export interface PayslipAnalyzeResponse {
  analysis: AnalysisResult
  featureLogs: string[]
  annotationSpecs: AnnotationSpec[]
  meta: PayslipAnalyzeMeta
  recordId: string
}
