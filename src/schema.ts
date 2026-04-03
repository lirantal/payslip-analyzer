import { Type } from "@google/genai";

const BOX_2D_DESC = "Bounding box [ymin, xmin, ymax, xmax] normalised to 0-1000";

export const SYSTEM_INSTRUCTION = `You are an expert Israeli payslip analyst fluent in Hebrew.
You will receive a salary pay slip as an image (PNG, JPEG, WebP, or a raster of PDF page 1). All bounding boxes must use the exact pixel dimensions of that image: [ymin, xmin, ymax, xmax] normalised to 0-1000, origin top-left (y increases downward).

Your task:
1. Identify and extract every financially significant field on the payslip.
2. For each field in insights, provide a bounding box in [ymin, xmin, ymax, xmax] format where each value is normalised to a 0-1000 scale relative to the full width and height of the image you see.
3. Categorise each insight into one of these categories: pension, keren_hishtalmut, expenses_reimbursed, net_pay, gross_pay, tax, social_security, health_insurance, or other.
4. Provide a brief explanation or financial insight for each insight field.
5. Produce a summary with totals for pension, keren hishtalmut, expenses reimbursed, net pay, plus any warnings or tips.
6. Fill personal_header accurately:
   - tax_credit_points: Israeli payslips show income-tax credit points as **נקודות זיכוי** or **נ״ז** in the **מצב משפחתי** / family-status block. The decimal (e.g. 1.50) is on the **same horizontal row / band as the נ״ז label** — typically **above** the separate rows for **תיאום מס**, **% הנחת יישוב**, and **מס קבוע**. A frequent error is drawing box_2d on those **lower** rows; that is wrong — ymin and ymax must stay in the **נ״ז row only** (digits vertically aligned with that label, not two lines lower). NOT in vacation/sick rows (חופשה, מחלה, הבראה). NOT in **חודשי עבודה** columns on the left (do not use their vertical rules). RTL: digits may sit left of נ״ז in the same row; xmin/xmax bracket **only** those glyphs. raw_text = printed number. Never use unrelated zeros at the page top. If you can parse a decimal, set points; if illegible, omit points.
   - employee_gender: use male or female only if the slip explicitly indicates gender (e.g. מין, זהות, or a clear marker). Otherwise use unknown.
   - When נקודות זיכוי / נ״ז is visible, also add one insights[] row for that same field (label exactly as printed: נקודות זיכוי or נ״ז; identical value and box_2d as personal_header.tax_credit_points).

Be precise with bounding box coordinates — they must tightly wrap the relevant value on the payslip.
Return ONLY valid JSON matching the required schema.`;

export const USER_PROMPT = `Analyze this salary pay slip. Extract all financially significant fields with their bounding box coordinates.

**נקודות זיכוי (income tax credit points):** Under **מצב משפחתי**, label **נ״ז** with a decimal on the **same row** (e.g. 1.50). **Do not** place box_2d on the rows below that show **תיאום מס**, **% הנחת יישוב**, or **מס קבוע** — those are different lines. **Do not** use **חודשי עבודה** / left table dividers. Box must tightly wrap **only** the נ״ז digits. Set personal_header.tax_credit_points and duplicate in insights[] (label נ״ז or נקודות זיכוי).

Set employee_gender from the slip when explicitly shown; otherwise unknown.

Pay special attention to:
- Total pension contributions (employee + employer)
- Keren Hishtalmut (קרן השתלמות) contributions (employee + employer)
- Expense reimbursements (החזר הוצאות)
- Net pay (שכר נטו)
- Gross pay (שכר ברוטו)
- Tax deductions (מס הכנסה)
- Social security / Bituach Leumi (ביטוח לאומי)
- Health insurance (ביטוח בריאות)

For each insight field provide the bounding box as [ymin, xmin, ymax, xmax] normalised to 0-1000.
Include financial insights, warnings, and tips in the summary.`;

const personalHeaderSchema = {
  type: Type.OBJECT,
  description: "Personal / header fields needed for programmatic checks",
  properties: {
    tax_credit_points: {
      type: Type.OBJECT,
      properties: {
        raw_text: {
          type: Type.STRING,
          description:
            "Printed value next to נקודות זיכוי or נ״ז (abbreviation with gershayim)",
        },
        points: {
          type: Type.NUMBER,
          description:
            "Parsed nekudot zikui when clearly readable; omit entirely if not reliably parseable",
        },
        box_2d: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: `Tight box on digit glyphs for נקודות זיכוי / נ״ז in the tax/personal-status block — not חודשי עבודה columns, not row below. ${BOX_2D_DESC}`,
        },
      },
      propertyOrdering: ["raw_text", "points", "box_2d"],
    },
    employee_gender: {
      type: Type.STRING,
      description: "One of: male, female, unknown",
    },
  },
  propertyOrdering: ["tax_credit_points", "employee_gender"],
};

export const RESPONSE_SCHEMA = {
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
            description: `Bounding box [ymin, xmin, ymax, xmax] normalised to 0-1000. ${BOX_2D_DESC}`,
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
    personal_header: personalHeaderSchema,
  },
  propertyOrdering: ["insights", "summary", "personal_header"],
};
