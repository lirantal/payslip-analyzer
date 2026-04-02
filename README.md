# Gemini Payslip Analyzer

Analyze Israeli salary pay slips using Google Gemini’s multimodal API. The tool extracts financially significant fields (with bounding boxes), prints **all** raw extractions and summary data to the console, and writes an output image. **Visual highlights** come only from pluggable **features**—for example [Payslip Gaps](docs/feature/payslip-gaps.md), which draws **red** boxes on detected issues.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [1Password CLI (`op`)](https://developer.1password.com/docs/cli/get-started/) installed and signed in (if using `run.sh`)
- A Gemini API key stored in 1Password (the secret reference is configured in `.env`)

## Project layout

```
├── .env
├── analyze.ts            # Entry shim (imports src/analyze.ts)
├── src/
│   ├── analyze.ts        # Main CLI
│   ├── schema.ts         # Gemini prompts + JSON schema
│   ├── gemini.ts         # API + response normalization
│   ├── annotate.ts       # Feature-driven SVG overlay + Sharp
│   ├── console.ts
│   ├── types.ts
│   └── features/         # AnnotationFeature registry + payslip-gaps
├── package.json
├── tsconfig.json
├── run.sh
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

```bash
./run.sh path/to/payslip.png
```

Or:

```bash
GEMINI_API_KEY=your-key npx tsx analyze.ts path/to/payslip.png
# or
GEMINI_API_KEY=your-key npm run analyze -- path/to/payslip.png
```

### Supported formats

- **Images:** PNG, JPEG, WebP
- **Documents:** PDF (sent natively to Gemini; first page is rasterized for annotation)

## How it works

1. The payslip is sent to `gemini-2.5-flash` with `responseJsonSchema` for structured JSON: `insights`, `summary`, and `personal_header` (header fields such as נקודות זיכוי for programmatic checks).
2. Temperature is `0` for stable extraction.
3. The CLI prints every insight, `personal_header`, and the summary (totals, warnings, tips).
4. Registered **features** (see `src/features/registry.ts`) produce `AnnotationSpec` overlays only when they detect something to highlight.
5. An SVG overlay is composited with Sharp and saved as **`output_annotated.png`** in the **current working directory**. If no feature returns boxes, the image is still saved without overlays.

## Payslip Gaps (red annotations)

Automated checks for high-impact payroll issues are documented in [docs/feature/payslip-gaps.md](docs/feature/payslip-gaps.md). The first implemented rule flags likely problems with **נקודות זיכוי** (tax credit points).

Module layout, contracts, and how to add features are described in [docs/architecture.md](docs/architecture.md).

## Category colors (historical note)

The MVP drew every insight with category-based colors. **That behavior is removed:** category colours are no longer used for default annotation; only feature-supplied colours apply (payslip gaps use red).
