# Gemini Payslip Analyzer

Analyze Israeli salary pay slips using Google Gemini's multimodal vision API. The tool extracts financial insights (pension, Keren Hishtalmut, expense reimbursements, tax, etc.) with bounding box coordinates and produces an annotated output image with color-coded highlights.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [1Password CLI (`op`)](https://developer.1password.com/docs/cli/get-started/) installed and signed in
- A Gemini API key stored in 1Password (the secret reference is configured in `.env`)

## Project layout

```
├── .env                  # 1Password secret reference for GEMINI_API_KEY
├── analyze.ts            # Main analysis script
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── run.sh                # One-command runner (wraps op + tsx)
└── README.md
```

## Setup

Install dependencies:

```bash
npm install
```

The `.env` file contains a 1Password secret reference:

```
GEMINI_API_KEY=op://LocalDev/jskiq5neymqozozeiimfekqefq/credential
```

Edit the vault, item, and field names to match your 1Password setup.

## Running

The quickest way — just run the wrapper script with a path to your payslip:

```bash
./run.sh path/to/payslip.png
```

Or run directly with your API key:

```bash
GEMINI_API_KEY=your-key npx tsx analyze.ts path/to/payslip.png
```

### Supported formats

- **Images:** PNG, JPEG, WebP
- **Documents:** PDF (sent natively to Gemini — no conversion needed)

## How it works

1. The payslip file is loaded and sent to the Gemini API (`gemini-2.5-flash`) with a structured prompt requesting financial field extraction
2. Temperature is set to 0 for deterministic, precise extraction
3. Gemini returns a JSON response containing extracted fields, each with:
   - A category (pension, keren_hishtalmut, expenses_reimbursed, etc.)
   - The Hebrew label as it appears on the payslip
   - The monetary value
   - A bounding box in `[ymin, xmin, ymax, xmax]` format normalised to 0-1000
   - A brief financial insight
4. A summary is printed to the console with totals, warnings, and tips
5. An SVG overlay with color-coded bounding boxes and labels is composited onto the original image using Sharp
6. The annotated image is saved as `output_annotated.png`

## Category color coding

| Category | Color |
|---|---|
| Pension | Blue |
| Keren Hishtalmut | Green |
| Expenses Reimbursed | Orange |
| Net Pay | Purple |
| Gross Pay | Cyan |
| Tax | Red |
| Social Security | Yellow |
| Health Insurance | Pink |
| Other | Gray |
