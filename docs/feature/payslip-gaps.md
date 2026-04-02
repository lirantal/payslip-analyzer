# Payslip Gaps

For how this feature plugs into the CLI (registry, `AnnotationFeature`, rendering), see [architecture.md](../architecture.md).

## What it is

**Payslip Gaps** are high-impact issues that can be inferred from a single Israeli salary slip (*תלוש משכורת*) by combining structured extraction with deterministic rules. Each gap type is implemented as a small **detector**; detectors are grouped under the **payslip gaps** feature plugin so new rules can be added without changing the core CLI.

Visual highlights on the output image are driven only by features (not by every raw extracted field). **Payslip gap** overlays use **red** (`#DC2626`) so they stay distinct from any future feature colors.

## Why it matters

Employees often lose money when payroll metadata is wrong—especially income tax withholding driven by **נקודות זיכוי** (tax credit points). Wrong or missing points mean **מס הכנסה** is too high for months on end; amounts can often be corrected retroactively, but cash flow and net pay suffer immediately.

This feature turns slip data into **actionable, explainable flags** plus **on-slip annotations** where a bounding box is available.

## How it works (architecture)

1. **Gemini** returns a single JSON object matching the app schema: `insights`, `summary`, and **`personal_header`** (header fields used for programmatic checks).
2. The CLI prints **all** insights and summary lines for debugging and insight (unchanged intent).
3. Registered **`AnnotationFeature`** modules run against the parsed result; each returns `AnnotationSpec[]` (box, color, label) and optional log lines.
4. **`annotateImage`** composites only those specs onto the raster payslip (PDF page 1 is rendered first when needed).
5. If there are **no** annotations, the tool still writes **`output_annotated.png`** as a raster copy of the slip (no overlays).

### Extending with a new gap

1. Add a detector under [`../../src/features/payslip-gaps/detectors/`](../../src/features/payslip-gaps/detectors/) that reads from `AnalysisResult` (and extend the Gemini schema / `personal_header` if new parent fields are required).
2. Register the detector in [`../../src/features/payslip-gaps/index.ts`](../../src/features/payslip-gaps/index.ts) (`DETECTORS` array).
3. Document required extracted fields in this file under “Parent data requirements” for that gap.

New **non-gap** features can be added by implementing `AnnotationFeature` and appending to [`../../src/features/registry.ts`](../../src/features/registry.ts).

---

## Gap 1: Missing or inaccurate tax credit points (נקודות זיכוי)

### Parent data requirements

| Field | Source in API | Purpose |
|--------|----------------|--------|
| נקודות זיכוי raw text | `personal_header.tax_credit_points.raw_text` | Audit / debug |
| Parsed points | `personal_header.tax_credit_points.points` | Only set when the model can parse a reliable number; **omit** if illegible |
| Box around the value | `personal_header.tax_credit_points.box_2d` | Red annotation on the slip |
| Employee gender | `personal_header.employee_gender` | `male` / `female` / `unknown` from explicit slip fields only |

Constants (for messaging and future calculators): baseline **2.25** (male) / **2.75** (female); **242 NIS** per point per month (2026 context)—see [`../../src/features/payslip-gaps/constants.ts`](../../src/features/payslip-gaps/constants.ts).

### Rules implemented (v1)

- **Male:** if `points` is present and (`points === 0` or `points < 2.25`) → gap (likely under-withheld credits / over-withholding of tax).
- **Female:** if `points === 0` or `points < 2.75` → gap.
- **Unknown gender:** if `points === 0` → gap with a verify-style message. If `0 < points < 2.25` → gap as well: below the male baseline, so suspicious for any standard resident; we do not use the female baseline (2.75) without gender, to avoid flagging men who correctly have e.g. 2.5.

If `points` is **omitted** (unparsed), the detector **does not** assert a gap; it logs that numeric parsing was skipped.

If a gap is detected but `box_2d` is invalid, the issue is **console-only** (no red box).

### Out of scope for v1

- **Mother with young children** but only baseline **2.75** shown: needs extra signals (dependents on slip, user-provided context, or HR data)—not inferred safely from the current schema alone.
- **Non-residents** and other exceptions to default baselines.
- **Unknown gender** and `points` between 2.25 and 2.74: could be a correct male slip or an under-credited female slip; we do not flag without gender on the slip.

### Detector implementation

[`../../src/features/payslip-gaps/detectors/nekudot-zikui.ts`](../../src/features/payslip-gaps/detectors/nekudot-zikui.ts)
