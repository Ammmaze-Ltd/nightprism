/**
 * npm registry lookup helpers.
 *
 * Used by the hallucinated-deps rule to verify that declared packages
 * actually exist on the public npm registry, and to score their popularity.
 */

export interface NpmPackageInfo {
  exists: boolean;
  weeklyDownloads: number | null;
}

const REGISTRY_BASE = "https://registry.npmjs.org";
const DOWNLOADS_BASE = "https://api.npmjs.org/downloads/point/last-week";

/**
 * URL-encode a package name for npm registry endpoints.
 * Scoped names like "@types/node" must become "@types%2Fnode".
 */
function encodePackageName(name: string): string {
  // Only the slash in the scope separator needs encoding;
  // the leading "@" is allowed.
  return name.replace("/", "%2F");
}

/**
 * Check whether a package exists on the public npm registry.
 * Returns true for HTTP 200, false for 404, false for any other error.
 */
async function packageExists(name: string): Promise<boolean> {
  const url = `${REGISTRY_BASE}/${encodePackageName(name)}`;
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Fetch last-week download count for a package.
 * Returns null if the package doesn't exist, the API failed, or the
 * response shape is unexpected.
 */
async function fetchWeeklyDownloads(name: string): Promise<number | null> {
  const url = `${DOWNLOADS_BASE}/${encodePackageName(name)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "downloads" in data &&
      typeof (data as { downloads: unknown }).downloads === "number"
    ) {
      return (data as { downloads: number }).downloads;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check whether a package exists on npm and how many weekly downloads it has.
 *
 * Network failures are swallowed (returns exists=false, weeklyDownloads=null)
 * so the scanner doesn't crash when npm is having a bad day.
 */
export async function checkNpmPackage(name: string): Promise<NpmPackageInfo> {
  const [exists, weeklyDownloads] = await Promise.all([
    packageExists(name),
    fetchWeeklyDownloads(name),
  ]);

  return {
    exists,
    weeklyDownloads: exists ? weeklyDownloads : null,
  };
}
