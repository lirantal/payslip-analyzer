/**
 * Debug logging for Gemini generateContent usage (token counts + rough USD).
 * Rates: Gemini 2.5 Flash, approximate public pricing per 1M tokens (Apr 2026).
 */
const INPUT_USD_PER_MILLION = 0.3
const OUTPUT_USD_PER_MILLION = 2.5

const INPUT_USD_PER_TOKEN = INPUT_USD_PER_MILLION / 1_000_000
const OUTPUT_USD_PER_TOKEN = OUTPUT_USD_PER_MILLION / 1_000_000

let backendGeminiCallSeq = 0

export interface GeminiUsageMetadataLike {
  promptTokenCount?: number
  candidatesTokenCount?: number
  totalTokenCount?: number
  thoughtsTokenCount?: number
  cachedContentTokenCount?: number
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** Rough USD estimate: input + output + thinking (output-priced when present). */
export function estimateGemini25FlashCostUsd(usage: GeminiUsageMetadataLike | undefined): number {
  if (!usage) return 0
  const prompt = num(usage.promptTokenCount)
  const candidates = num(usage.candidatesTokenCount)
  const thoughts = num(usage.thoughtsTokenCount)
  return (
    prompt * INPUT_USD_PER_TOKEN + candidates * OUTPUT_USD_PER_TOKEN + thoughts * OUTPUT_USD_PER_TOKEN
  )
}

export function logGeminiGenerateContentUsage(params: {
  label: string
  model: string
  usage: unknown
}): void {
  backendGeminiCallSeq += 1
  const call = backendGeminiCallSeq
  const raw = params.usage
  if (!raw || typeof raw !== 'object') {
    console.log(
      `[gemini:usage] call=${String(call)} label=${params.label} model=${params.model} usageMetadata=missing`,
    )
    return
  }
  const u = raw as GeminiUsageMetadataLike
  const promptTokens = num(u.promptTokenCount)
  const candidatesTokens = num(u.candidatesTokenCount)
  const totalTokens = num(u.totalTokenCount)
  const thoughtsTokens = num(u.thoughtsTokenCount)
  const cachedContentTokens = num(u.cachedContentTokenCount)
  const estimatedUsd = estimateGemini25FlashCostUsd(u)
  console.log(
    `[gemini:usage] call=${String(call)} label=${params.label} model=${params.model} ` +
      `promptTokens=${String(promptTokens)} candidatesTokens=${String(candidatesTokens)} ` +
      `totalTokens=${String(totalTokens)} thoughtsTokens=${String(thoughtsTokens)} ` +
      `cachedContentTokens=${String(cachedContentTokens)} estimatedUsd=${estimatedUsd.toFixed(6)}`,
  )
}
