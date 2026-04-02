import { GoogleGenAI, Type } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { createCanvas, type Canvas } from "canvas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Insight {
  category: string;
  label: string;
  value: string;
  box_2d: number[]; // [ymin, xmin, ymax, xmax] normalised 0-1000
  explanation: string;
}

interface Summary {
  total_pension: string;
  total_keren_hishtalmut: string;
  total_expenses_reimbursed: string;
  net_pay: string;
  warnings: string[];
  tips: string[];
}

interface AnalysisResult {
  insights: Insight[];
  summary: Summary;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  pension: "#2563EB",
  keren_hishtalmut: "#16A34A",
  expenses_reimbursed: "#EA580C",
  net_pay: "#7C3AED",
  gross_pay: "#0891B2",
  tax: "#DC2626",
  social_security: "#CA8A04",
  health_insurance: "#DB2777",
  default: "#6B7280",
};

const SYSTEM_INSTRUCTION = `You are an expert Israeli payslip analyst fluent in Hebrew.
You will receive an image (or PDF) of a salary pay slip written in Hebrew.

Your task:
1. Identify and extract every financially significant field on the payslip.
2. For each field, provide a bounding box in [ymin, xmin, ymax, xmax] format where each value is normalised to a 0-1000 scale relative to the full image dimensions.
3. Categorise each field into one of these categories: pension, keren_hishtalmut, expenses_reimbursed, net_pay, gross_pay, tax, social_security, health_insurance, or other.
4. Provide a brief explanation or financial insight for each field.
5. Produce a summary with totals for pension, keren hishtalmut, expenses reimbursed, net pay, plus any warnings or tips.

Be precise with bounding box coordinates — they must tightly wrap the relevant value on the payslip.
Return ONLY valid JSON matching the required schema.`;

const USER_PROMPT = `Analyze this salary pay slip. Extract all financially significant fields with their bounding box coordinates.

Pay special attention to:
- Total pension contributions (employee + employer)
- Keren Hishtalmut (קרן השתלמות) contributions (employee + employer)
- Expense reimbursements (החזר הוצאות)
- Net pay (שכר נטו)
- Gross pay (שכר ברוטו)
- Tax deductions (מס הכנסה)
- Social security / Bituach Leumi (ביטוח לאומי)
- Health insurance (ביטוח בריאות)

For each field provide the bounding box as [ymin, xmin, ymax, xmax] normalised to 0-1000.
Include financial insights, warnings, and tips in the summary.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    insights: {
      type: Type.ARRAY,
      description: "Each financially significant field extracted from the payslip",
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            description:
              "One of: pension, keren_hishtalmut, expenses_reimbursed, net_pay, gross_pay, tax, social_security, health_insurance, other",
          },
          label: {
            type: Type.STRING,
            description: "The Hebrew field name as it appears on the payslip",
          },
          value: {
            type: Type.STRING,
            description: "The extracted monetary value (e.g. 1,234.56)",
          },
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "Bounding box [ymin, xmin, ymax, xmax] normalised to 0-1000",
          },
          explanation: {
            type: Type.STRING,
            description: "Brief financial insight about this field",
          },
        },
        propertyOrdering: ["category", "label", "value", "box_2d", "explanation"],
      },
    },
    summary: {
      type: Type.OBJECT,
      description: "Aggregated financial summary of the payslip",
      properties: {
        total_pension: {
          type: Type.STRING,
          description: "Total pension contributions (employee + employer)",
        },
        total_keren_hishtalmut: {
          type: Type.STRING,
          description: "Total Keren Hishtalmut contributions (employee + employer)",
        },
        total_expenses_reimbursed: {
          type: Type.STRING,
          description: "Total expenses reimbursed to the employee",
        },
        net_pay: { type: Type.STRING, description: "Net pay amount" },
        warnings: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Financial warnings or red flags",
        },
        tips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Financial tips and advice",
        },
      },
      propertyOrdering: [
        "total_pension",
        "total_keren_hishtalmut",
        "total_expenses_reimbursed",
        "net_pay",
        "warnings",
        "tips",
      ],
    },
  },
  propertyOrdering: ["insights", "summary"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };
  const mime = mimeTypes[ext];
  if (!mime) {
    console.error(`Unsupported file type: ${ext}`);
    process.exit(1);
  }
  return mime;
}

function loadFileAsBase64(filePath: string): string {
  return Buffer.from(fs.readFileSync(filePath)).toString("base64");
}

// ---------------------------------------------------------------------------
// Gemini analysis
// ---------------------------------------------------------------------------

async function analyzePayslip(filePath: string): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({});

  const mimeType = getMimeType(filePath);
  const data = loadFileAsBase64(filePath);

  console.log(`Sending ${path.basename(filePath)} (${mimeType}) to Gemini for analysis ...`);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { inlineData: { mimeType, data } },
      USER_PROMPT,
    ],
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

  const result: AnalysisResult = JSON.parse(text);
  return result;
}

// ---------------------------------------------------------------------------
// Image annotation
// ---------------------------------------------------------------------------

function colorForCategory(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.default;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildAnnotationSvg(
  width: number,
  height: number,
  insights: Insight[],
): string {
  let rects = "";

  for (const insight of insights) {
    const [ymin, xmin, ymax, xmax] = insight.box_2d;
    const x1 = Math.round((xmin / 1000) * width);
    const y1 = Math.round((ymin / 1000) * height);
    const x2 = Math.round((xmax / 1000) * width);
    const y2 = Math.round((ymax / 1000) * height);

    const boxW = x2 - x1;
    const boxH = y2 - y1;
    const color = colorForCategory(insight.category);

    const labelText = `${escapeXml(insight.label)}: ${escapeXml(insight.value)}`;
    const fontSize = Math.max(12, Math.min(16, Math.round(height / 60)));
    const labelW = labelText.length * fontSize * 0.55 + 12;
    const labelH = fontSize + 10;

    // Position label above the box; if no room, put it below
    const labelY = y1 - labelH - 2 >= 0 ? y1 - labelH - 2 : y2 + 2;
    const labelX = x1;

    rects += `
      <rect x="${x1}" y="${y1}" width="${boxW}" height="${boxH}"
            fill="none" stroke="${color}" stroke-width="3" rx="2" />
      <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}"
            fill="${color}" rx="3" opacity="0.9" />
      <text x="${labelX + 6}" y="${labelY + fontSize + 2}"
            font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}"
            fill="white" font-weight="bold">${labelText}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects}</svg>`;
}

async function renderPdfToBuffer(pdfPath: string): Promise<Buffer> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);

  const scale = 2.0;
  const viewport = page.getViewport({ scale });
  const canvas: Canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");

  await page.render({
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  await doc.destroy();
  return canvas.toBuffer("image/png");
}

async function annotateImage(
  inputPath: string,
  insights: Insight[],
  outputPath: string,
): Promise<void> {
  const mimeType = getMimeType(inputPath);

  let imageBuffer: Buffer;
  if (mimeType === "application/pdf") {
    console.log("Rendering PDF first page to PNG for annotation ...");
    imageBuffer = await renderPdfToBuffer(inputPath);
  } else {
    imageBuffer = fs.readFileSync(inputPath) as unknown as Buffer;
  }

  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const validInsights = insights.filter(
    (i) => Array.isArray(i.box_2d) && i.box_2d.length === 4,
  );

  if (validInsights.length === 0) {
    console.warn("No valid bounding boxes to annotate.");
    return;
  }

  const svgOverlay = buildAnnotationSvg(width, height, validInsights);
  const svgBuffer = Buffer.from(svgOverlay);

  await sharp(imageBuffer)
    .composite([{ input: svgBuffer, top: 0, left: 0 }])
    .png()
    .toFile(outputPath);

  console.log(`Annotated image saved to ${outputPath}`);
}

// ---------------------------------------------------------------------------
// Console output
// ---------------------------------------------------------------------------

function printSummary(result: AnalysisResult): void {
  console.log("\n========================================");
  console.log("  PAYSLIP ANALYSIS RESULTS");
  console.log("========================================\n");

  console.log(`Extracted ${result.insights.length} field(s):\n`);
  for (const insight of result.insights) {
    const color = insight.category.toUpperCase().padEnd(22);
    console.log(`  [${color}] ${insight.label}: ${insight.value}`);
    if (insight.explanation) {
      console.log(`                          -> ${insight.explanation}`);
    }
  }

  const s = result.summary;
  console.log("\n--- Summary ---");
  console.log(`  Total Pension:             ${s.total_pension}`);
  console.log(`  Total Keren Hishtalmut:    ${s.total_keren_hishtalmut}`);
  console.log(`  Total Expenses Reimbursed: ${s.total_expenses_reimbursed}`);
  console.log(`  Net Pay:                   ${s.net_pay}`);

  if (s.warnings?.length) {
    console.log("\n  Warnings:");
    for (const w of s.warnings) {
      console.log(`    ! ${w}`);
    }
  }

  if (s.tips?.length) {
    console.log("\n  Tips:");
    for (const t of s.tips) {
      console.log(`    * ${t}`);
    }
  }

  console.log("\n========================================\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx analyze.ts <path-to-payslip>");
    console.error("  Supported formats: PNG, JPEG, WebP, PDF");
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  console.log(`Loading payslip from ${resolved} ...`);
  const fileSize = fs.statSync(resolved).size;
  console.log(`File size: ${(fileSize / 1024).toFixed(1)} KB`);

  const result = await analyzePayslip(resolved);
  printSummary(result);

  const projectDir = path.dirname(new URL(import.meta.url).pathname);
  const outputPath = path.join(projectDir, "output_annotated.png");
  await annotateImage(resolved, result.insights, outputPath);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
