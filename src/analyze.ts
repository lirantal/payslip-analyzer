import * as fs from "fs";
import * as path from "path";
import { annotateImage } from "./annotate.js";
import { printFeatureLogs, printSummary } from "./console.js";
import { analyzePayslip } from "./gemini.js";
import { annotationFeatures } from "./features/registry.js";
import { preparePayslipForPipeline } from "./payslip-input.js";

async function main(): Promise<void> {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx analyze.ts <path-to-payslip>");
    console.error("  Supported formats: PNG, JPEG, WebP, PDF");
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  console.log(`Loading payslip from ${resolved} ...`);
  const fileSize = fs.statSync(resolved).size;
  console.log(`File size: ${(fileSize / 1024).toFixed(1)} KB`);

  const prepared = await preparePayslipForPipeline(resolved);
  const result = await analyzePayslip(prepared.geminiInline, path.basename(resolved));
  printSummary(result);

  const allAnnotations = [];
  const allLogLines: string[] = [];

  for (const feature of annotationFeatures) {
    const { annotations, logLines } = await feature.run({
      analysis: result,
      rasterBuffer: prepared.rasterBuffer,
    });
    allAnnotations.push(...annotations);
    if (logLines?.length) allLogLines.push(...logLines);
  }

  printFeatureLogs(allLogLines);

  const outputPath = path.join(process.cwd(), "output_annotated.png");
  await annotateImage(prepared.rasterBuffer, allAnnotations, outputPath);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
