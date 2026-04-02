import { GoogleGenAI } from "@google/genai";
import * as path from "path";
import { loadFileAsBase64, getMimeType } from "./mime.js";
import { RESPONSE_SCHEMA, SYSTEM_INSTRUCTION, USER_PROMPT } from "./schema.js";
import type { AnalysisResult, PersonalHeader, Summary } from "./types.js";

const EMPTY_SUMMARY: Summary = {
  total_pension: "",
  total_keren_hishtalmut: "",
  total_expenses_reimbursed: "",
  net_pay: "",
  warnings: [],
  tips: [],
};

const EMPTY_PERSONAL_HEADER: PersonalHeader = {
  tax_credit_points: { raw_text: "", box_2d: [] },
  employee_gender: "unknown",
};

function normalizeGender(g: string | undefined): PersonalHeader["employee_gender"] {
  const v = (g ?? "unknown").toLowerCase().trim();
  if (v === "male" || v === "female" || v === "unknown") return v;
  return "unknown";
}

/** Ensures required shapes exist when the model omits optional sections. */
export function normalizeAnalysisResult(raw: unknown): AnalysisResult {
  const o = raw as Partial<AnalysisResult>;
  const ph = o.personal_header;
  const tcp = ph?.tax_credit_points;

  return {
    insights: Array.isArray(o.insights) ? o.insights : [],
    summary: o.summary ? { ...EMPTY_SUMMARY, ...o.summary } : { ...EMPTY_SUMMARY },
    personal_header: {
      tax_credit_points: {
        raw_text: tcp?.raw_text ?? "",
        ...(typeof tcp?.points === "number" ? { points: tcp.points } : {}),
        box_2d: Array.isArray(tcp?.box_2d) ? tcp!.box_2d : [],
      },
      employee_gender: normalizeGender(ph?.employee_gender),
    },
  };
}

export async function analyzePayslip(filePath: string): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({});

  const mimeType = getMimeType(filePath);
  const data = loadFileAsBase64(filePath);

  console.log(`Sending ${path.basename(filePath)} (${mimeType}) to Gemini for analysis ...`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ inlineData: { mimeType, data } }, USER_PROMPT],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }

  const parsed: unknown = JSON.parse(text);
  return normalizeAnalysisResult(parsed);
}
