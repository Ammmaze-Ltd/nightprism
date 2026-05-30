/**
 * Rule 5 — Hallucinated dependencies.
 *
 * Scans a package.json for declared packages that don't exist on the public
 * npm registry (likely AI hallucinations, slopsquatting risk) or have
 * suspiciously low download counts.
 */

import { readFile } from "node:fs/promises";
import { checkNpmPackage } from "../npm-registry.js";
import type { Finding } from "../types.js";

const RULE_NAME = "hallucinated-deps";
const YELLOW_DOWNLOAD_THRESHOLD = 100;

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Version specifiers that point at non-registry sources — git, local paths,
 * monorepo workspaces, etc. We can't (and shouldn't) verify these against
 * the public registry.
 */
function isNonRegistryVersion(version: string): boolean {
  return (
    version.startsWith("file:") ||
    version.startsWith("git+") ||
    version.startsWith("git:") ||
    version.startsWith("git@") ||
    version.startsWith("github:") ||
    version.startsWith("link:") ||
    version.startsWith("workspace:") ||
    version.startsWith("http://") ||
    version.startsWith("https://")
  );
}

/**
 * Find the 1-indexed line number where a dependency name appears in the
 * raw package.json text. Returns 1 if the name can't be located (the
 * package.json was structured unusually).
 */
function findLineOfDep(rawText: string, depName: string): number {
  const lines = rawText.split("\n");
  const needle = `"${depName}"`;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.includes(needle)) {
      return i + 1;
    }
  }
  return 1;
}

export async function scanHallucinatedDeps(
  packageJsonPath: string
): Promise<Finding[]> {
  const rawText = await readFile(packageJsonPath, "utf-8");
  const pkg = JSON.parse(rawText) as PackageJson;

  const allDeps: Array<[string, string]> = [
    ...Object.entries(pkg.dependencies ?? {}),
    ...Object.entries(pkg.devDependencies ?? {}),
    ...Object.entries(pkg.peerDependencies ?? {}),
  ];

  const findings: Finding[] = [];

  for (const [name, version] of allDeps) {
    if (isNonRegistryVersion(version)) continue;

    const info = await checkNpmPackage(name);
    const line = findLineOfDep(rawText, name);
    const snippet = `"${name}": "${version}"`;

    if (!info.exists) {
      findings.push({
        rule: RULE_NAME,
        severity: "red",
        file: packageJsonPath,
        line,
        column: 1,
        snippet,
        message: `Package "${name}" does not exist on npm — likely AI hallucination (slopsquatting risk).`,
        fix_with_cursor:
          `Remove the "${name}" dependency from package.json. It doesn't exist on the public npm registry and is likely an AI hallucination. ` +
          `If you need similar functionality, search npm for an established alternative or implement the feature directly.`,
      });
      continue;
    }

    if (
      info.weeklyDownloads !== null &&
      info.weeklyDownloads < YELLOW_DOWNLOAD_THRESHOLD
    ) {
      findings.push({
        rule: RULE_NAME,
        severity: "yellow",
        file: packageJsonPath,
        line,
        column: 1,
        snippet,
        message: `Package "${name}" exists but has only ${info.weeklyDownloads} weekly downloads — possible squatter or newly-published. Review manually.`,
        fix_with_cursor:
          `Verify the "${name}" package on npmjs.com before keeping it. Low download counts can indicate squatters or AI-hallucinated typos of more popular packages. ` +
          `If unsure, search for a more established alternative.`,
      });
    }
  }

  return findings;
}
