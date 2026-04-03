import { GoogleGenAI, Type } from "@google/genai";

/** Minimal structured JSON from Gemini on a single image (used for crop refinement). */
export async function generateStructuredJsonFromImage(
  pngBase64: string,
  options: {
    systemInstruction: string;
    userPrompt: string;
    responseJsonSchema: object;
  },
): Promise<unknown> {
  const ai = new GoogleGenAI({});
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ inlineData: { mimeType: "image/png", data: pngBase64 } }, options.userPrompt],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseJsonSchema: options.responseJsonSchema,
      systemInstruction: options.systemInstruction,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini (structured image call)");
  }
  return JSON.parse(text);
}

export const NEKUDOT_REFINE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    found: {
      type: Type.BOOLEAN,
      description: "True if נ״ז / נקודות זיכוי numeric cell is visible in this crop",
    },
    box_2d: {
      type: Type.ARRAY,
      items: { type: Type.INTEGER },
      description:
        "[ymin, xmin, ymax, xmax] normalised 0-1000 relative to THIS crop image only, origin top-left",
    },
  },
  propertyOrdering: ["found", "box_2d"],
};

export const NEKUDOT_REFINE_SYSTEM = `You are given a cropped fragment of an Israeli payslip image.
Return JSON only. The box uses [ymin, xmin, ymax, xmax] each 0-1000 relative to the crop's width and height (top-left origin).

Task: find ONLY the printed decimal digits for income-tax credit points — label on the slip is נ״ז or נקודות זיכוי. The number sits on the SAME row as that label (e.g. 1.50, 2.25). Draw the tightest box around those digit glyphs only — not rows below (e.g. תיאום מס, % הנחת יישוב), not unrelated columns.

If the value is not visible in this crop, set found=false and box_2d to [0,0,0,0].`;

export const NEKUDOT_REFINE_USER = `Locate the נ״ז / נקודות זיכוי number in this crop. If visible, found=true and box_2d on the digits only.`;
