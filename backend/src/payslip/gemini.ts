import { GoogleGenAI } from '@google/genai'
import { logGeminiGenerateContentUsage } from './gemini-usage-debug'
import { RESPONSE_SCHEMA, SYSTEM_INSTRUCTION, USER_PROMPT } from './schema'
import type {
  AnalysisResult,
  EmployeeGender,
  PensionMoneyField,
  Summary,
} from './types'

const EMPTY_SUMMARY: Summary = {
  total_pension: '',
  total_keren_hishtalmut: '',
  total_expenses_reimbursed: '',
  net_pay: '',
  warnings: [],
  tips: [],
}

function normalizePensionMoneyField(raw: Partial<PensionMoneyField> | undefined): PensionMoneyField {
  return {
    raw_text: raw?.raw_text ?? '',
    ...(typeof raw?.amount_ils === 'number' && Number.isFinite(raw.amount_ils)
      ? { amount_ils: raw.amount_ils }
      : {}),
    box_2d: Array.isArray(raw?.box_2d) ? raw!.box_2d : [],
  }
}

function normalizeGender(g: string | undefined): EmployeeGender {
  const v = (g ?? 'unknown').toLowerCase().trim()
  if (v === 'male' || v === 'female' || v === 'unknown') return v
  return 'unknown'
}

export function normalizeAnalysisResult(raw: unknown): AnalysisResult {
  const o = raw as Partial<AnalysisResult>
  const ph = o.personal_header
  const tcp = ph?.tax_credit_points
  const pc = ph?.pension_compliance

  return {
    insights: Array.isArray(o.insights) ? o.insights : [],
    summary: o.summary ? { ...EMPTY_SUMMARY, ...o.summary } : { ...EMPTY_SUMMARY },
    personal_header: {
      tax_credit_points: {
        raw_text: tcp?.raw_text ?? '',
        ...(typeof tcp?.points === 'number' ? { points: tcp.points } : {}),
        box_2d: Array.isArray(tcp?.box_2d) ? tcp!.box_2d : [],
      },
      employee_gender: normalizeGender(ph?.employee_gender),
      pension_compliance: {
        pensionable_salary: normalizePensionMoneyField(pc?.pensionable_salary),
        employer_tagmulim: normalizePensionMoneyField(pc?.employer_tagmulim),
        employee_pension_deduction: normalizePensionMoneyField(pc?.employee_pension_deduction),
      },
    },
  }
}

export interface GeminiInlinePayload {
  mimeType: string
  data: string
}

export async function analyzePayslip(
  apiKey: string,
  inline: GeminiInlinePayload,
  _logBasename: string,
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey })

  const model = 'gemini-2.5-flash'
  const response = await ai.models.generateContent({
    model,
    contents: [{ inlineData: { mimeType: inline.mimeType, data: inline.data } }, USER_PROMPT],
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  logGeminiGenerateContentUsage({
    label: 'analyzePayslip',
    model,
    usage: response.usageMetadata,
  })

  const text = response.text
  if (!text) {
    throw new Error('Empty response from Gemini')
  }

  const parsed: unknown = JSON.parse(text)
  return normalizeAnalysisResult(parsed)
}
