import * as fs from "fs";
import { getMimeType } from "./mime.js";
import { renderPdfPageToPngBuffer } from "./pdf-render.js";

export interface PreparedPayslip {
  /** Inline payload for Gemini (same visual as rasterBuffer). */
  geminiInline: { mimeType: string; data: string };
  /** Exact pixels that box_2d normalizes against (composite annotations here). */
  rasterBuffer: Buffer;
}

/**
 * Builds one raster representation of the payslip for both multimodal analysis and annotation.
 * PDFs are rendered once with pdf.js so Gemini's 0–1000 boxes match our overlay; image inputs use the file bytes as-is.
 */
export async function preparePayslipForPipeline(filePath: string): Promise<PreparedPayslip> {
  const mimeType = getMimeType(filePath);

  if (mimeType === "application/pdf") {
    console.log(
      "Rendering PDF page 1 to PNG once — used for both Gemini analysis and annotation (aligned coordinates).",
    );
    const rasterBuffer = await renderPdfPageToPngBuffer(filePath);
    return {
      geminiInline: {
        mimeType: "image/png",
        data: rasterBuffer.toString("base64"),
      },
      rasterBuffer,
    };
  }

  const rasterBuffer = fs.readFileSync(filePath) as Buffer;
  return {
    geminiInline: {
      mimeType,
      data: rasterBuffer.toString("base64"),
    },
    rasterBuffer,
  };
}
