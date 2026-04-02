import * as fs from "fs";
import * as path from "path";

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };
  const mime = mimeTypes[ext];
  if (!mime) {
    console.error(`Unsupported file type: ${ext}`);
    process.exit(1);
  }
  return mime;
}

export function loadFileAsBase64(filePath: string): string {
  return Buffer.from(fs.readFileSync(filePath)).toString("base64");
}
