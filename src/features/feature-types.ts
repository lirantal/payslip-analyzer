import type { AnalysisResult, AnnotationSpec } from "../types.js";

export interface AnnotationFeatureContext {
  analysis: AnalysisResult;
}

/** Pluggable feature that contributes visual annotations (and optional log lines). */
export interface AnnotationFeature {
  readonly id: string;
  run(ctx: AnnotationFeatureContext): {
    annotations: AnnotationSpec[];
    logLines?: string[];
  };
}
