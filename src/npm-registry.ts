  export interface NpmPackageInfo {
    exists: boolean;
    weeklyDownloads: number | null;
  }

  export async function checkNpmPackage(name: string): Promise<NpmPackageInfo> {
    throw new Error("not implemented");
  }

