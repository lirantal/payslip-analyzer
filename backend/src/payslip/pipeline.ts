import { analyzePayslip } from './gemini'
import { annotationFeatures } from './features/registry'
import { preparePayslipForPipeline } from './prepare-input'
import { getMimeTypeFromFilename } from './mime'
import type { AnalysisResult, AnnotationSpec, PayslipAnalyzeResponse } from './types'
import { readBitmapSizeWithFallback } from './image-utils'

export interface RunPayslipPipelineOptions {
  geminiApiKey: string
  /** When true, skip second Gemini pass for nekudot box refinement. */
  disableNekudotRefine?: boolean
}

export async function runPayslipPipeline(
  fileBytes: Uint8Array,
  originalFilename: string,
  opts: RunPayslipPipelineOptions,
): Promise<PayslipAnalyzeResponse> {
  const prepared = await preparePayslipForPipeline(fileBytes, originalFilename)

  const analysis: AnalysisResult = await analyzePayslip(
    opts.geminiApiKey,
    prepared.geminiInline,
    originalFilename,
  )

  const allAnnotations: AnnotationSpec[] = []
  const featureLogs: string[] = []

  for (const feature of annotationFeatures) {
    const { annotations, logLines } = await feature.run({
      analysis,
      rasterBytes: prepared.rasterBytes,
      rasterMimeType: prepared.rasterMimeType,
      geminiApiKey: opts.geminiApiKey,
      disableNekudotRefine: opts.disableNekudotRefine,
    })
    allAnnotations.push(...annotations)
    if (logLines?.length) featureLogs.push(...logLines)
  }

  const { w: width, h: height } = await readBitmapSizeWithFallback(
    prepared.rasterBytes,
    prepared.rasterMimeType,
  )

  const declaredMime = getMimeTypeFromFilename(originalFilename) ?? prepared.rasterMimeType

  return {
    analysis,
    featureLogs,
    annotationSpecs: allAnnotations,
    meta: {
      originalFilename,
      mimeType: declaredMime,
      rasterMimeType: prepared.rasterMimeType,
      width,
      height,
    },
  }
}
