import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { scanHallucinatedDeps } from "../../src/rules/hallucinated-deps.js";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, "../fixtures/package-with-hallucination.json");

describe("scanHallucinatedDeps", () => {
  it("emits a red finding for a hallucinated package", async () => {
    const findings = await scanHallucinatedDeps(FIXTURE);
    const reds = findings.filter((f) => f.severity === "red");
    expect(reds.length).toBeGreaterThanOrEqual(1);
    expect(reds[0]?.snippet).toContain("nightprism-fake-package");
    expect(reds[0]?.rule).toBe("hallucinated-deps");
  });

  it("does not flag real popular packages (lodash)", async () => {
    const findings = await scanHallucinatedDeps(FIXTURE);
    const lodashFindings = findings.filter((f) => f.snippet.includes("lodash"));
    expect(lodashFindings).toEqual([]);
  });

  it("reports a non-1 line number for the fake package", async () => {
    const findings = await scanHallucinatedDeps(FIXTURE);
    const fake = findings.find((f) => f.snippet.includes("nightprism-fake-package"));
    expect(fake?.line).toBeGreaterThan(1);
  });
});
