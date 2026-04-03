# Bounding boxes — what works and what to avoid

This document captures **first principles** and **practical lessons** from getting accurate overlays on Israeli payslips (especially **נ״ז / נקודות זיכוי**). The goal is to avoid long **prompt-only trial-and-error** when boxes drift vertically, horizontally, or land on the wrong table cell.

For pipeline wiring (prepare → Gemini → features → Sharp), see [architecture.md](architecture.md).

---

## The real problem

Structured extraction from Gemini is often **numerically and semantically correct** (e.g. `points: 1.5`) while **`box_2d` is wrong**. On **dense Hebrew tables**—multiple columns, RTL text, thin grid lines—the model’s **full-page** bounding boxes are a **weak regression**: small systematic errors look like “a bit below,” “shifted left,” or “wrong row.”

That is usually **not**:

- a bug in `pixel = (norm / 1000) * dimension`, or  
- a mismatch between “analysis image” and “annotation image.”

It **is** often **vision difficulty at full resolution + full layout complexity**.

---

## First principles (must hold)

### 1. One raster for analysis and drawing

**Rule:** The bitmap that Gemini uses for the **main** extraction call must be **byte-identical** to the bitmap Sharp composites onto.

**Implementation:** [`preparePayslipForPipeline`](../src/payslip-input.ts) — for PDFs, render page **once** with pdf.js, send that PNG to Gemini, and pass the **same buffer** to [`annotateImage`](../src/annotate.ts).

**If you break this** (e.g. send native PDF to Gemini but render PDF differently for overlays), normalized `0–1000` coordinates **cannot** line up with pixels, no matter how good the prompts are.

### 2. Coordinate convention

Gemini / Vertex style: **`[ymin, xmin, ymax, xmax]`**, each **0–1000**, origin **top-left**, **y** increases downward.

**Implementation:** [`box2dToPixelRect`](../src/box2d.ts) — clamp, min/max corners, convert to pixel rect. Do not “invent” alternate orderings without checking the API docs.

### 3. Sharp + SVG overlay

The SVG is created at **exactly** the raster width/height, then composited at `(0,0)`. No extra scaling layer if dimensions match.

---

## What made accuracy jump (second pass on a crop)

The **largest win** was **not** another paragraph in the system prompt. It was:

### Crop-based refinement (נ״ז)

1. **First pass** (full page): full schema — `insights`, `summary`, `personal_header`, coarse `tax_credit_points.box_2d`.
2. **Detector** still decides **whether** there is a gap and builds an initial `AnnotationSpec`.
3. **Before drawing**, [`refineNekudotBoxOnRaster`](../src/features/payslip-gaps/refine-nekudot-box.ts):
   - Builds a **crop** from the full raster: expand the coarse normalized box by a margin, or fall back to a **default ROI** (lower-center band where **מצב משפחתי** often lives).
   - Sends **only that PNG** to Gemini with a **minimal JSON schema** (`found` + `box_2d` **relative to the crop**).
   - Maps crop-local `0–1000` back to **full-image** `0–1000`.

**Why it works:** The model solves a **small, local** task (“digits for נ״ז in this fragment”) instead of **global** localization on a busy page. Fewer confounders → tighter boxes.

**Cost / control:** Extra API call per run when a נ״ז gap is annotated. Set **`DISABLE_NEKUDOT_BOX_REFINE=true`** to disable ([README](../README.md)).

**Code entry points:**

- [`gemini-json.ts`](../src/gemini-json.ts) — generic “one image + small schema” call.
- [`refine-nekudot-box.ts`](../src/features/payslip-gaps/refine-nekudot-box.ts) — crop math + coordinate remap.

---

## Supporting techniques (still valuable)

### Reconciliation of header vs insights

[`tax-credit-resolve.ts`](../src/features/payslip-gaps/tax-credit-resolve.ts) merges `personal_header.tax_credit_points` with an **`insights[]`** row whose label matches **נקודות זיכוי** or **נ״ז** (and abbreviation variants). It can:

- Fix **`points`** when the header says `0` but the insight row shows a positive value.
- Replace **`box_2d`** when the header box is missing or in an **extreme top strip** (often a wrong “0” or logo band).

This reduces **logical** inconsistency; it does not replace **crop refinement** for pixel-tight boxes.

### Prompts and schema hints

Prompts should still:

- Name **נ״ז** explicitly (common on slips).
- Contrast with **חופשה / מחלה / הבראה**, **חודשי עבודה**, and rows like **תיאום מס** / **% הנחת יישוב** (wrong row is a recurring failure mode).
- Ask for a **duplicate** `insights[]` line for נ״ז for cross-checking.

**Expectation:** Prompts **improve** first-pass quality; they **rarely** fix systematic spatial error alone on dense forms.

### PDF render scale

[`PDF_PAGE_RENDER_SCALE`](../src/pdf-render.ts) (currently **3×**) trades file size/latency for **sharper digits** in the PNG. Too low a scale can hurt both extraction and boxes.

### Label placement (`preferLabelBelow`)

For header-adjacent fields, drawing the **caption above** the box often **covers מצב משפחתי / נ״ז**. [`AnnotationSpec.preferLabelBelow`](../src/types.ts) draws the badge **under** the rectangle when possible ([`annotate.ts`](../src/annotate.ts)).

---

## Common errors to avoid (what we tried that did not suffice)

| Pitfall | Why it failed or hurt |
|--------|------------------------|
| **Assuming the bug was coordinate math** | Conversion was already correct; chasing ymin/xmin swaps wasted time. Verify “same raster” first. |
| **Sending native PDF to Gemini while annotating a pdf.js PNG** | Two different render pipelines → normalized boxes **systematically** misaligned. Fix: one shared raster (PNG from pdf.js for both). |
| **Relying only on stronger prompts** | Helped a bit (נ״ז vs wrong row vs wrong column) but did **not** fix persistent “slightly below” / “wrong cell” **geometry**. |
| **Expecting one full-page call to place tight boxes** | Model is doing OCR + structure + many fields; **spatial regression** for one small cell is noisy. |
| **Ignoring RTL / multi-column context in prompts only** | Without a **smaller visual field**, the model still confuses adjacent columns (e.g. חודשי עבודה) or rows below (תיאום מס). |
| **Always placing the label above the box** | Correct for some fields; for נ״ז it **obscured** the very labels the user needs to see. |
| **Tweaking magic vertical “nudge” constants in code** | Fragile, slip-specific, and fights the model instead of **changing the task shape** (crop). |

---

## Checklist when boxes look wrong again

1. **Confirm** `preparePayslipForPipeline` still feeds the **same** `rasterBuffer` to Gemini and to `annotateImage`.
2. **Confirm** `box_2d` order is `[ymin, xmin, ymax, xmax]` and **0–1000**.
3. **Check** whether refinement ran (console: `Refining נ״ז box...` / `Applied crop-based...`). If disabled, re-enable or remove `DISABLE_NEKUDOT_BOX_REFINE`.
4. **Tune** crop only after the above: `NORM_MARGIN`, `PIXEL_PAD`, or `DEFAULT_ROI_NORM` in [`refine-nekudot-box.ts`](../src/features/payslip-gaps/refine-nekudot-box.ts) for unusual slip layouts.
5. **Extend** the same **“crop + small schema”** pattern for **other** fields only if needed—do not grow the main schema into a second full-page vision task.

---

## Related documentation

- [feature/payslip-gaps.md](feature/payslip-gaps.md) — gap rules, reconciliation, refinement summary  
- [architecture.md](architecture.md) — modules, async features, registry  
- [project.md](project.md) — end-to-end flow and PDF handling  
