# LLM usage, token counts, and cost (Gemini)

This document describes how the backend observes Gemini usage after each `generateContent` call: what the numbers mean, where they come from, and how we turn them into rough USD for debugging and cost tracking.

## SDK

We use **`@google/genai`** (`GoogleGenAI`) for all Gemini calls. Successful responses include **`usageMetadata`** on the object returned by `ai.models.generateContent(...)`; you do not need a special “verbose” flag to receive it.

## Where the data lives

After:

```ts
const response = await ai.models.generateContent({ ... })
```

read:

- **`response.usageMetadata`** — token accounting for that request.

Our code passes that object into `logGeminiGenerateContentUsage` in `src/payslip/gemini-usage-debug.ts` immediately after each successful `generateContent` (see `src/payslip/gemini.ts` and `src/payslip/gemini-json.ts`).

## What is counted (field reference)

These fields are the ones we log and/or use in estimates (names match typical Gemini API usage metadata):

| Field | Meaning |
| --- | --- |
| **`promptTokenCount`** | Tokens attributed to the **input side** of the request: user-visible text parts, **system instruction**, tools/context as applicable, and **multimodal input** such as **`inlineData`** (e.g. base64 images or PDF segments). For our payslip flow, **images are part of the prompt** and are reflected here once the API has tokenized the full request. |
| **`candidatesTokenCount`** | Tokens in the **model output** (the generated candidate text, e.g. JSON). |
| **`totalTokenCount`** | Overall total as reported by the API (useful for a single headline number). |
| **`thoughtsTokenCount`** | Internal “thinking” / reasoning tokens when the model uses a **thinking budget** (non-zero `thinkingConfig.thinkingBudget`). We currently set **`thinkingBudget: 0`**, so this is usually zero; if enabled, these are typically billed like output. |
| **`cachedContentTokenCount`** | Tokens served from **context cache**, when used; billing for cached vs non-cached input can differ from standard input pricing. |

**Important:** We do **not** maintain a separate “image token” line item. **`promptTokenCount` is the authoritative post-request count for “everything we sent as prompt,” including inline images.**

## How we log it

Implementation: **`src/payslip/gemini-usage-debug.ts`**.

- Each backend `generateContent` invocation increments a **monotonic `call` sequence** (per runtime / isolate). That gives you **order and volume** of LLM calls in logs.
- Log prefix: **`[gemini:usage]`** (easy to grep in `pnpm run logs:backend` or Workers logs).
- **`label`** identifies the call site, e.g. `analyzePayslip` or `generateStructuredJsonFromImage`.
- If `usageMetadata` is absent, we log `usageMetadata=missing` instead of throwing.

Example shape:

```text
[gemini:usage] call=1 label=analyzePayslip model=gemini-2.5-flash promptTokens=… candidatesTokens=… totalTokens=… thoughtsTokens=… cachedContentTokens=… estimatedUsd=0.000150
```

## How we estimate USD (approximate)

The helper **`estimateGemini25FlashCostUsd`** applies **fixed rates per million tokens** intended as a **rough** guide for **Gemini 2.5 Flash** (aligned with public list pricing as of early 2026; verify against [Google AI pricing](https://ai.google.dev/pricing) for billing).

Current constants in code:

- **Input (prompt):** $0.30 per 1M tokens  
- **Output (candidates) and thinking:** $2.50 per 1M tokens  

Formula:

```text
estimatedUsd =
  promptTokenCount   × (0.30 / 1_000_000)
+ candidatesTokenCount × (2.50 / 1_000_000)
+ thoughtsTokenCount   × (2.50 / 1_000_000)
```

**Caveats:**

- **Not an invoice.** Actual charges depend on account, region, promotions, and current Google pricing.
- **`cachedContentTokenCount` is logged** but we **do not** apply a separate cached rate (e.g. lower $/M for cached input) in the estimate, because the split between billable prompt vs cache-specific pricing should follow Google’s billing rules for your setup.
- If you change **model** or **thinking budget**, update rates or logic in `gemini-usage-debug.ts` to stay meaningful.

## Pre-flight token count (optional)

To estimate **input size before** calling `generateContent`, the SDK supports **`countTokens`** with the same **`model`** and **`contents`** you plan to send. That is useful for guarding very large `inlineData` payloads. We do not currently call `countTokens` in the payslip pipeline; add it where you need upfront bounds or cost warnings.

## Related files

| File | Role |
| --- | --- |
| `src/payslip/gemini-usage-debug.ts` | Token fields, USD estimate, `[gemini:usage]` logging, call counter |
| `src/payslip/gemini.ts` | Main payslip `generateContent`; logs after each call |
| `src/payslip/gemini-json.ts` | Structured JSON image calls; logs after each call |

## FAQ

### Question: I implemented it in my backend. I uploaded a base64 of the image (about 100KB), does that also get included in the token cost count? what is the esitmation for it?

Answer: 

For token usage count like this:

```
1|backend  | [gemini:usage] call=2 label=analyzePayslip model=gemini-2.5-flash promptTokens=1572 candidatesTokens=2213 totalTokens=3785 thoughtsTokens=0 cachedContentTokens=0 estimatedUsd=0.006004
1|backend  | [wrangler:info] POST /api/payslip/analyze 200 OK (11315ms)
```

Those numbers are spot on. Your calculation is perfectly aligned with the current **Gemini 2.5 Flash** pricing for April 2026.

Breaking Down Your Log: based on the metadata you provided, here is how the math breaks down:

| Type | Count | Rate (per 1M tokens) | Calculation | Cost (USD) |
| :--- | :--- | :--- | :--- | :--- |
| **Input (Prompt)** | 1,572 | $0.30 | $1,572 \times 0.0000003$ | $0.0004716$ |
| **Output (Response)** | 2,213 | $2.50 | $2,213 \times 0.0000025$ | $0.0055325$ |
| **Total** | **3,785** | — | — | **$0.0060041** |

Your backend logged `0.006004`, which is exactly right (rounded to six decimal places).

---

Does the Token Count "Make Sense"? You mentioned the image was **100KB**, but you're seeing **1,572 prompt tokens**. This might feel high if you're thinking in terms of file size, but here is why it's correct:

1.  **Image Tokenization:** In the Gemini 2.x family, images aren't billed by bytes. They are "tokenized" based on their resolution. For a standard payslip image, the model typically consumes a fixed **258 tokens** (representing the image as a grid).
2.  **System Instructions & Schema:** Since you are using `responseJsonSchema` and a `SYSTEM_INSTRUCTION`, these are included in every single call. A robust payslip extraction schema can easily take up 500–800 tokens on its own because the model has to "read" the definition of every field you want.
3.  **The Prompt:** The remaining tokens (~500) cover your actual `USER_PROMPT` and the overhead of the base64 wrapper.

Why was this call $0.006? The most interesting part of your log is the **Output (Candidates)**. At **2,213 tokens**, your response is actually longer than your prompt. 
* **Prompt:** 1,572 tokens ($0.00047)
* **Response:** 2,213 tokens ($0.00553)

Because output tokens are **8x more expensive** than input tokens on the Flash model, the "heavy lifting" for your cost is actually the JSON the model is writing back to you, not the image you uploaded.

A Quick Optimization Tip: If you are processing many payslips with the *exact same* system instruction and schema, you could potentially use **Context Caching**. 
* **Current Prompt Cost:** $0.30 / 1M tokens.
* **Cached Prompt Cost:** $0.03 / 1M tokens (90% cheaper).

If your `SYSTEM_INSTRUCTION` and `RESPONSE_SCHEMA` are large, you can cache them once and only pay the full price for the unique image and user prompt in each call.
