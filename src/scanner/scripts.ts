export interface ScriptRisk {
  package: string;
  scriptType: string;
  command: string;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  recommendation: string;
}

const DANGEROUS_PATTERNS = [
  { pattern: /curl.*\|.*sh/i, reason: "Downloading and executing remote script", risk: "high", recommendation: "Review the script and consider manual verification." },
  { pattern: /wget.*\|.*sh/i, reason: "Downloading and executing remote script", risk: "high", recommendation: "Review the script and consider manual verification." },
  { pattern: /eval\(/i, reason: "Dynamic code execution", risk: "high", recommendation: "Check if the dynamic code is necessary or potentially malicious." },
  { pattern: /chmod \+x/i, reason: "Making file executable", risk: "medium", recommendation: "Ensure the file being made executable is expected." },
  { pattern: /nc -/i, reason: "Network utility usage (netcat)", risk: "high", recommendation: "Verify why the package is using low-level network tools." },
  { pattern: /node -e/i, reason: "Executing arbitrary node code", risk: "medium", recommendation: "Check the purpose of the inline script." },
  { pattern: /cat \/etc\/passwd/i, reason: "Reading sensitive system files", risk: "high", recommendation: "This is a major red flag. Avoid this package." },
  { pattern: /env \|/i, reason: "Exposing environment variables", risk: "high", recommendation: "Potential secret theft. Do not use this package." },
  { pattern: /powershell/i, reason: "Using PowerShell directly", risk: "medium", recommendation: "Commonly used for cross-platform scripts but worth checking." },
  { pattern: /bash -c/i, reason: "Using bash for command execution", risk: "medium", recommendation: "Commonly used for cross-platform scripts but worth checking." },
];

export function scanScripts(packageJson: any): ScriptRisk[] {
  const risks: ScriptRisk[] = [];
  const scripts = packageJson.scripts || {};
  const packageName = packageJson.name || "unknown";

  const lifecycleHooks = ['preinstall', 'postinstall', 'install', 'preuninstall', 'postuninstall'];

  for (const hook of lifecycleHooks) {
    const command = scripts[hook];
    if (command) {
      for (const { pattern, reason, risk, recommendation } of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
          risks.push({
            package: packageName,
            scriptType: hook,
            command,
            riskLevel: risk as any,
            reason,
            recommendation
          });
        }
      }
    }
  }

  return risks;
}
