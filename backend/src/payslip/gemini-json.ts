import { GoogleGenAI, Type } from '@google/genai'
import { logGeminiGenerateContentUsage } from './gemini-usage-debug'

export async function generateStructuredJsonFromImage(
  apiKey: string,
  pngBase64: string,
  options: {
    systemInstruction: string
    userPrompt: string
    responseJsonSchema: object
  },
): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey })
  const model = 'gemini-2.5-flash'
  const response = await ai.models.generateContent({
    model,
    contents: [{ inlineData: { mimeType: 'image/png', data: pngBase64 } }, options.userPrompt],
    config: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseJsonSchema: options.responseJsonSchema,
      systemInstruction: options.systemInstruction,
      thinkingConfig: { thinkingBudget: 0 },
    },
  })
  logGeminiGenerateContentUsage({
    label: 'generateStructuredJsonFromImage',
    model,
    usage: response.usageMetadata,
  })
  const text = response.text
  if (!text) {
    throw new Error('Empty response from Gemini (structured image call)')
  }
  return JSON.parse(text)
}

export const NEKUDOT_REFINE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    found: {
      type: Type.BOOLEAN,
      description: 'True if נ״ז / נקודות זיכוי numeric cell is visible in this crop',
    },
    box_2d: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description:
        '[ymin, xmin, ymax, xmax] normalised 0-1000 relative to THIS crop image only, origin top-left',
    },
  },
  propertyOrdering: ['found', 'box_2d'],
}

export const NEKUDOT_REFINE_SYSTEM = `You are given a cropped fragment of an Israeli payslip image.
Return JSON only. The box uses [ymin, xmin, ymax, xmax] each 0-1000 relative to the crop's width and height (top-left origin).

Task: locate income-tax **נקודות זיכוי** / **נ״ז** — the value is a small decimal like 1.50 or 2.25 on the **same table row as the נ״ז label**.

Vertical order on many slips (top of crop → bottom): marital lines (e.g. בן זוג עובד), then the **נ״ז row** (label + decimal), then **lower** rows that show **% מס קבוע**, **מס קבוע**, **תיאום מס**, **% הנחת יישוב**. Those lower rows are **wrong** for this task — never draw the box around "% מס קבוע" text, around מס קבוע labels, or around cells that belong to those lines. The correct box wraps **only** the digit glyphs of the נ״ז decimal, on the **upper** of the two bands when both נ״ז and % מס קבוע appear in the crop.

Do NOT box בן זוג עובד or מצב משפחתי.

If the נ״ז decimal is not visible in this crop, set found=false and box_2d to [0,0,0,0].`

export const NEKUDOT_REFINE_USER = `Return a tight box on the נ״ז decimal digits only (e.g. 1.50). If you see % מס קבוע or מס קבוע in this crop, the נ״ז number is on the row above that — do not box the tax-percent row.`
