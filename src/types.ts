/**
 * Shared types used across all detection rules.
 */

export type Severity = "red" | "yellow" | "green";

/**
 * A single issue surfaced by a rule.
 *
 * Findings are emitted by rule modules and aggregated by the scanner
 * orchestrator. The CLI / MCP server is responsible for presenting them.
 */
export interface Finding {
  /** Slug of the rule that produced this finding (e.g. "hallucinated-deps"). */
  rule: string;
  /** "red" blocks ship; "yellow" warns; "green" is informational only. */
  severity: Severity;
  /** Absolute or workspace-relative file path. */
  file: string;
  /** 1-indexed line number where the issue lives. */
  line: number;
  /** 1-indexed column. Best-effort; rules may set to 1 if unknown. */
  column: number;
  /** Short raw excerpt of the offending code or config line. */
  snippet: string;
  /** Plain-English explanation, one sentence. */
  message: string;
  /** Ready-to-paste prompt the user can hand to Cursor / Claude Code. */
  fix_with_cursor: string;
}

export interface ScanResult {
  verdict: Severity;
  findings: Finding[];
}
