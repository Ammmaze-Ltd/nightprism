import { describe, it, expect } from "vitest";
import { checkNpmPackage } from "../src/npm-registry.js";

/**
 * These tests hit the real npm registry. They're slow but truthful —
 * if the registry shape changes, the scanner should know immediately.
 *
 * Vitest default timeout is 5s; npm is fast enough that we don't bump it.
 */
describe("checkNpmPackage", () => {
  it("returns exists=true for a real, popular package (lodash)", async () => {
    const result = await checkNpmPackage("lodash");
    expect(result.exists).toBe(true);
    expect(result.weeklyDownloads).toBeGreaterThan(1_000_000);
  });

  it("handles scoped package names via URL encoding (@types/node)", async () => {
    const result = await checkNpmPackage("@types/node");
    expect(result.exists).toBe(true);
    expect(result.weeklyDownloads).toBeGreaterThan(10_000);
  });

  it("returns exists=false for a clearly hallucinated package", async () => {
    const result = await checkNpmPackage(
      "nightprism-this-package-should-never-exist-xyz-1234567890"
    );
    expect(result.exists).toBe(false);
    expect(result.weeklyDownloads).toBeNull();
  });

  it("returns a numeric weeklyDownloads when the package exists", async () => {
    const result = await checkNpmPackage("react");
    expect(result.exists).toBe(true);
    expect(typeof result.weeklyDownloads).toBe("number");
    expect(result.weeklyDownloads).toBeGreaterThan(0);
  });
});
