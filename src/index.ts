/**
 * nightprism CLI — v0.1 entry point.
 *
 * Usage:
 *   npx tsx src/index.ts [path-to-package.json]
 *
 * Exit codes:
 *   0 — green or yellow verdict
 *   2 — red verdict (something must be fixed before shipping)
 */

import { scanHallucinatedDeps } from "./rules/hallucinated-deps.js";
import type { Finding, Severity } from "./types.js";

const SEVERITY_RANK: Record<Severity, number> = { green: 0, yellow: 1, red: 2 };
const SEVERITY_EMOJI: Record<Severity, string> = {
  green: "🟢",
  yellow: "🟡",
  red: "🔴",
};
const VERDICT_LINE: Record<Severity, string> = {
  green: "🟢 SHIP IT — zero issues found.",
  yellow: "🟡 SHIP WITH CAUTION — review the items below.",
  red: "🔴 DON'T SHIP — fix the items below before pushing.",
};

function worstSeverity(severities: Severity[]): Severity {
  let worst: Severity = "green";
  for (const s of severities) {
    if (SEVERITY_RANK[s] > SEVERITY_RANK[worst]) worst = s;
  }
  return worst;
}

function printFinding(f: Finding): void {
  console.log(`${SEVERITY_EMOJI[f.severity]}  ${f.file}:${f.line}`);
  console.log(`    ${f.snippet}`);
  console.log(`    ${f.message}`);
  console.log(`    🪄 Fix with Cursor: ${f.fix_with_cursor}`);
  console.log("");
}

async function main(): Promise<void> {
  const targetPath = process.argv[2] ?? "./package.json";
  console.log(`nightprism v0.1.0 — scanning ${targetPath}\n`);

  const findings = await scanHallucinatedDeps(targetPath);
  const verdict: Severity =
    findings.length === 0 ? "green" : worstSeverity(findings.map((f) => f.severity));

  console.log("━".repeat(60));
  console.log(VERDICT_LINE[verdict]);
  console.log("━".repeat(60));
  console.log("");

  for (const f of findings) printFinding(f);

  if (findings.length === 0) {
    console.log("No findings. You're clear to ship.\n");
  }

  process.exit(verdict === "red" ? 2 : 0);
}

main().catch((err: unknown) => {
  console.error("Scan failed:", err);
  process.exit(1);
});
