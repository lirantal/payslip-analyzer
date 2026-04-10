import { normalizeAnalysisResult } from './gemini'
import { getMimeTypeFromFilename } from './mime'
import { preparePayslipForPipeline } from './prepare-input'
import { readBitmapSizeWithFallback } from './image-utils'
import type { AnnotationSpec, PayslipAnalyzeResponse } from './types'
import rawDevFixture from '../../fixtures/payslip-analyze-dev-response.json'

function envFlagTruthy(v: string | undefined): boolean {
  const s = v?.trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes'
}

export function usePayslipAnalyzeFixture(env: { PAYSLIP_USE_ANALYZE_FIXTURE?: string }): boolean {
  return envFlagTruthy(env.PAYSLIP_USE_ANALYZE_FIXTURE)
}

function asAnnotationSpecs(raw: unknown): AnnotationSpec[] {
  if (!Array.isArray(raw)) return []
  const out: AnnotationSpec[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id : ''
    const strokeColor = typeof o.strokeColor === 'string' ? o.strokeColor : ''
    const label = typeof o.label === 'string' ? o.label : ''
    const box_2d = Array.isArray(o.box_2d) ? o.box_2d.filter((n): n is number => typeof n === 'number') : []
    if (!id || !strokeColor || !label) continue
    const spec: AnnotationSpec = { id, box_2d, strokeColor, label }
    if (o.preferLabelBelow === true) spec.preferLabelBelow = true
    out.push(spec)
  }
  return out
}

/**
 * When PAYSLIP_USE_ANALYZE_FIXTURE is enabled, builds the same shape as
 * `runPayslipPipeline` using JSON from `fixtures/payslip-analyze-dev-response.json`.
 * Paste a prior successful API body there (with or without `recordId`); `meta` is
 * recomputed from the uploaded image so width/height match what you send.
 */
export async function payslipResponseFromDevFixture(
  fileBytes: Uint8Array,
  originalFilename: string,
): Promise<PayslipAnalyzeResponse> {
  const body = rawDevFixture as Record<string, unknown>
  const analysis = normalizeAnalysisResult(body.analysis)
  const featureLogs = Array.isArray(body.featureLogs)
    ? body.featureLogs.filter((x): x is string => typeof x === 'string')
    : []
  const annotationSpecs = asAnnotationSpecs(body.annotationSpecs)

  const prepared = await preparePayslipForPipeline(fileBytes, originalFilename)
  const { w: width, h: height } = await readBitmapSizeWithFallback(
    prepared.rasterBytes,
    prepared.rasterMimeType,
  )
  const declaredMime = getMimeTypeFromFilename(originalFilename) ?? prepared.rasterMimeType

  return {
    analysis,
    featureLogs,
    annotationSpecs,
    meta: {
      originalFilename,
      mimeType: declaredMime,
      rasterMimeType: prepared.rasterMimeType,
      width,
      height,
    },
  }
}
