import type { AnalysisResult, AnnotationSpec } from '../types'

export interface AnnotationFeatureContext {
  analysis: AnalysisResult
  rasterBytes: Uint8Array
  rasterMimeType: string
  geminiApiKey: string
  disableNekudotRefine?: boolean
}

export interface AnnotationFeature {
  readonly id: string
  run(ctx: AnnotationFeatureContext): Promise<{
    annotations: AnnotationSpec[]
    logLines?: string[]
  }>
}
