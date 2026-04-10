import type { AnnotationFeature } from './feature-types'
import { payslipGapsFeature } from './payslip-gaps/index'

export const annotationFeatures: AnnotationFeature[] = [payslipGapsFeature]
