# Architecture — Payslip Analyzer

This document describes the **low-level design** of the CLI after the extraction vs. annotation split and the **feature registry** refactor. Use it when adding features, extending the Gemini schema, or changing how overlays are produced.

For product context and run instructions, see [project.md](project.md). For the Payslip Gaps feature specifically, see [feature/payslip-gaps.md](feature/payslip-gaps.md).

---

## Design goals

1. **Single structured extraction** — One Gemini call returns schema-constrained JSON (`insights`, `summary`, `personal_header`) for high-fidelity, typed data.
2. **Raw data always visible** — All extracted fields are printed to the console; nothing is hidden behind features.
3. **Feature-driven visualization** — Nothing is drawn on the payslip unless a registered **annotation feature** returns `AnnotationSpec` entries. This keeps the MVP behavior (annotate every insight) from creeping back in.
4. **Open/closed extension** — New behavior is added by registering features or adding small detectors, not by growing a single orchestration file.

---

## Layered view

| Layer | Responsibility | Primary modules |
|--------|----------------|-----------------|
| **Entry** | Parse CLI args, resolve paths, orchestrate the pipeline | `src/analyze.ts`, root `analyze.ts` (shim) |
| **Extraction** | MIME detection, base64 payload, Gemini API, JSON parse + normalize | `src/gemini.ts`, `src/schema.ts`, `src/mime.ts` |
| **Domain types** | Shared TypeScript contracts | `src/types.ts` |
| **Presentation (console)** | Human-readable dump of extraction + feature log lines | `src/console.ts` |
| **Features** | Derive overlays and messages from `AnalysisResult` | `src/features/*` |
| **Rendering** | Raster source image, SVG overlay, Sharp composite | `src/annotate.ts` |

---

## End-to-end pipeline

Sequence of operations in `src/analyze.ts`:

```mermaid
sequenceDiagram
  participant CLI as analyze.ts
  participant Gem as gemini.ts
  participant Sch as schema.ts
  participant Con as console.ts
  participant Reg as registry.ts
  participant Feat as AnnotationFeature
  participant Ann as annotate.ts

  CLI->>Gem: analyzePayslip(path)
  Gem->>Sch: RESPONSE_SCHEMA prompts
  Gem->>Gem: normalizeAnalysisResult
  Gem-->>CLI: AnalysisResult
  CLI->>Con: printSummary(result)
  loop each feature
    CLI->>Reg: annotationFeatures
    Reg->>Feat: run({ analysis })
    Feat-->>CLI: annotations logLines
  end
  CLI->>Con: printFeatureLogs(lines)
  CLI->>Ann: annotateImage(path specs outputPath)
```

---

## Module dependency graph

Solid arrows mean **imports** (compile-time dependency). The CLI is the composition root: it wires extraction, features, and rendering.

```mermaid
flowchart TB
  subgraph entry [Entry]
    RootAnalyze[analyze.ts root shim]
    Main[src/analyze.ts]
  end

  subgraph extraction [Extraction]
    Gemini[src/gemini.ts]
    Schema[src/schema.ts]
    Mime[src/mime.ts]
  end

  subgraph core [Core types]
    Types[src/types.ts]
  end

  subgraph presentation [Console]
    Console[src/console.ts]
  end

  subgraph rendering [Rendering]
    Annotate[src/annotate.ts]
  end

  subgraph features [Features]
    Registry[src/features/registry.ts]
    FeatureTypes[src/features/feature-types.ts]
    PayslipGaps[src/features/payslip-gaps]
    Detectors[detectors/*.ts]
  end

  RootAnalyze --> Main
  Main --> Gemini
  Main --> Console
  Main --> Annotate
  Main --> Registry
  Gemini --> Schema
  Gemini --> Mime
  Gemini --> Types
  Console --> Types
  Annotate --> Mime
  Annotate --> Types
  Registry --> FeatureTypes
  Registry --> PayslipGaps
  FeatureTypes --> Types
  PayslipGaps --> FeatureTypes
  PayslipGaps --> Types
  PayslipGaps --> Detectors
  Detectors --> Types
  Schema --> GenAI["@google/genai Type enum"]
```

Notes:

- **`schema.ts`** is the only module that depends on **`@google/genai`** for `Type` (schema construction). **`gemini.ts`** uses `GoogleGenAI` for the API client.
- **`annotate.ts`** depends on **`sharp`**, **`canvas`**, and dynamic **`pdfjs-dist`** for PDF rasterization.
- **Feature modules** must not import **`annotate.ts`**; they only return data (`AnnotationSpec[]`). Rendering stays in one place.

---

## Core contracts

### `AnalysisResult` (`src/types.ts`)

The normalized output of extraction:

- **`insights`** — List of financially significant fields (raw data). Each row may include `box_2d` for model quality or future use; **the renderer does not consume `insights` directly**.
- **`summary`** — Aggregated strings and model-generated `warnings` / `tips`.
- **`personal_header`** — Header-level fields intended for **programmatic** rules (e.g. נקודות זיכוי, gender). Extend this object when a new detector needs structured parent data instead of parsing Hebrew labels out of `insights`.

`gemini.ts` **`normalizeAnalysisResult`** fills in safe defaults when the model omits pieces, so downstream code always sees a complete object graph.

### `AnnotationSpec` (`src/types.ts`)

What the **SVG/Sharp pipeline** understands:

| Field | Role |
|--------|------|
| `id` | Stable identifier (debugging, future deduplication) |
| `box_2d` | `[ymin, xmin, ymax, xmax]` normalized **0–1000** (Gemini convention) |
| `strokeColor` | Rectangle and label badge color (payslip gaps use red) |
| `label` | Short text on the badge |

Invalid or missing boxes are **dropped** in `annotate.ts` before drawing; features should still log issues when a gap exists but no box is available.

### `AnnotationFeature` (`src/features/feature-types.ts`)

Plugin interface:

```text
id: string
run(ctx: { analysis: AnalysisResult }) → { annotations: AnnotationSpec[], logLines?: string[] }
```

- **Idempotent expectation:** `run` should be a pure function of `analysis` (no hidden global state) unless you deliberately add services later.
- **Ordering:** `src/analyze.ts` merges lists in **registry order**; overlapping boxes are simply drawn in that order (no z-index logic yet).

---

## Feature registry

**File:** [`src/features/registry.ts`](../src/features/registry.ts)

```typescript
export const annotationFeatures: AnnotationFeature[] = [payslipGapsFeature /*, ... */];
```

To add a **new top-level capability** (e.g. “highlight voluntary deductions”):

1. Implement `AnnotationFeature` in a new module under `src/features/<name>/`.
2. Import it in `registry.ts` and append to `annotationFeatures`.

The CLI loop does not need to change.

---

## Payslip gaps as a nested plugin

**Folder:** [`src/features/payslip-gaps/`](../src/features/payslip-gaps/)

The exported **`payslipGapsFeature`** is one `AnnotationFeature`. Internally it runs a **`DETECTORS`** array (one file per rule):

- Add a new gap: create `detectors/<rule>.ts`, implement a function `(analysis: AnalysisResult) => { messages, annotations }`, register it in [`index.ts`](../src/features/payslip-gaps/index.ts).

This keeps **`registry.ts`** stable and avoids a single large “gaps” file.

---

## Extraction stack (Gemini)

| Piece | File | Role |
|--------|------|------|
| Prompts + JSON schema | `src/schema.ts` | `SYSTEM_INSTRUCTION`, `USER_PROMPT`, `RESPONSE_SCHEMA` |
| HTTP call + parse | `src/gemini.ts` | `analyzePayslip`, `normalizeAnalysisResult` |
| File I/O helpers | `src/mime.ts` | `getMimeType`, `loadFileAsBase64` |

When a detector needs **new parent fields**, update:

1. **`RESPONSE_SCHEMA`** and prompts in `schema.ts`.
2. **`types.ts`** (`PersonalHeader` or new top-level sections).
3. **`normalizeAnalysisResult`** in `gemini.ts` so partial API responses remain safe.
4. Feature documentation (e.g. [feature/payslip-gaps.md](feature/payslip-gaps.md) “Parent data requirements”).

---

## Annotation / rendering stack

| Function | Role |
|-----------|------|
| `annotateImage` | Load raster (or render PDF page 1 via pdf.js + node-canvas), merge valid `AnnotationSpec`s via SVG + Sharp, write PNG |
| `buildAnnotationSvg` | Pure: pixel dimensions + specs → SVG string |

**Output path:** `path.join(process.cwd(), "output_annotated.png")` — relative to the **process working directory**, not the script file.

**Empty specs:** The image is still written (raster copy without overlays) so PDF/image inputs behave consistently.

---

## Console output

| Function | When |
|----------|------|
| `printSummary` | After extraction; prints all `insights`, `personal_header`, and `summary` |
| `printFeatureLogs` | After all features run; prints merged `logLines` |

Keep console formatting changes localized to `console.ts` so extraction and features stay decoupled from stdout layout.

---

## Refactoring guidelines

1. **Do not** pass `insights[]` into `annotateImage` from the CLI; new visuals must go through **`AnnotationSpec`** and features.
2. **Prefer** extending `personal_header` (or a new named block in the schema) over regex-matching Hebrew `insight.label` strings in detectors.
3. **Keep** `registry.ts` as the single list of features — avoids scattered `import` side effects.
4. **Run** `npx tsc --noEmit` after structural changes; ESM imports use the **`.js` suffix** in TypeScript sources (`"module": "Node16"`).

---

## Related documents

- [project.md](project.md) — product overview, stack, operational notes
- [feature/payslip-gaps.md](feature/payslip-gaps.md) — first feature: rules, parent fields, extension notes
- [research/5-top-issues-in-israeli-payslips.md](research/5-top-issues-in-israeli-payslips.md) — backlog of candidate gap rules
