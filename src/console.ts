import type { AnalysisResult } from "./types.js";

export function printSummary(result: AnalysisResult): void {
  console.log("\n========================================");
  console.log("  PAYSLIP ANALYSIS RESULTS");
  console.log("========================================\n");

  console.log(`Extracted ${result.insights.length} field(s):\n`);
  for (const insight of result.insights) {
    const cat = insight.category.toUpperCase().padEnd(22);
    console.log(`  [${cat}] ${insight.label}: ${insight.value}`);
    if (insight.explanation) {
      console.log(`                          -> ${insight.explanation}`);
    }
  }

  const ph = result.personal_header;
  const tcp = ph.tax_credit_points;
  console.log("\n--- Personal header (programmatic) ---");
  console.log(`  נקודות זיכוי (raw):     ${tcp.raw_text || "(empty)"}`);
  console.log(
    `  נקודות זיכוי (parsed): ${typeof tcp.points === "number" ? String(tcp.points) : "(not parsed)"}`,
  );
  console.log(`  Employee gender:        ${ph.employee_gender}`);

  const s = result.summary;
  console.log("\n--- Summary ---");
  console.log(`  Total Pension:             ${s.total_pension}`);
  console.log(`  Total Keren Hishtalmut:    ${s.total_keren_hishtalmut}`);
  console.log(`  Total Expenses Reimbursed: ${s.total_expenses_reimbursed}`);
  console.log(`  Net Pay:                   ${s.net_pay}`);

  if (s.warnings?.length) {
    console.log("\n  Warnings:");
    for (const w of s.warnings) {
      console.log(`    ! ${w}`);
    }
  }

  if (s.tips?.length) {
    console.log("\n  Tips:");
    for (const t of s.tips) {
      console.log(`    * ${t}`);
    }
  }

  console.log("\n========================================\n");
}

export function printFeatureLogs(lines: string[]): void {
  if (lines.length === 0) return;
  console.log("--- Feature output ---");
  for (const line of lines) {
    console.log(line);
  }
  console.log("");
}
