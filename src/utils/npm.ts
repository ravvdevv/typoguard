import { execSync } from 'child_process';

export interface PackageMetadata {
  name: string;
  maintainers: string[];
  created: string;
  modified: string;
  version: string;
  description: string;
}

export function getPackageMetadata(packageName: string): PackageMetadata | null {
  try {
    const output = execSync(`npm view ${packageName} --json`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const data = JSON.parse(output);
    
    // Some packages return an array if multiple versions are found, but npm view usually returns the latest
    const pkg = Array.isArray(data) ? data[0] : data;

    return {
      name: pkg.name,
      maintainers: (pkg.maintainers || []).map((m: any) => typeof m === 'string' ? m : m.name),
      created: pkg.time?.created || '',
      modified: pkg.time?.modified || '',
      version: pkg.version,
      description: pkg.description || ''
    };
  } catch (e) {
    return null;
  }
}
