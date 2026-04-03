import type { AnalysisResult, AnnotationSpec } from "../types.js";

export interface AnnotationFeatureContext {
  analysis: AnalysisResult;
  /** Same raster as the main Gemini call — required for spatial refinement. */
  rasterBuffer: Buffer;
}

/** Pluggable feature that contributes visual annotations (and optional log lines). */
export interface AnnotationFeature {
  readonly id: string;
  run(ctx: AnnotationFeatureContext): Promise<{
    annotations: AnnotationSpec[];
    logLines?: string[];
  }>;
}
