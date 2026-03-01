# TypoGuard

A security utility for identifying typosquatting, malicious install scripts, and suspicious package heuristics within the npm ecosystem.

## Overview

TypoGuard is designed to provide a proactive layer of security for Node.js projects by scanning dependencies before and during installation. It focuses on identifying supply chain attacks that traditional vulnerability scanners (`npm audit`) often miss, such as brand-new malicious packages or compromised maintenance accounts.

## Core Features

- **Typosquat Detection**: Compares project dependencies against the top 100 most-downloaded npm packages to identify suspiciously similar names (e.g., `experss` vs `express`).
- **Install Script Analysis**: Scans `preinstall`, `postinstall`, and `install` hooks for dangerous patterns including remote script execution (`curl | sh`), dynamic code evaluation (`eval`), and unauthorized system access.
- **Metadata Heuristics**: Analyzes package age, maintainer count, and description quality to flag high-risk, newly created, or unmaintained dependencies.
- **CI/CD Integration**: Provides structured JSON output and non-zero exit codes for automated security gates in build pipelines.

## Installation

```bash
bun add -d typoguard
# or
npm install --save-dev typoguard
```

## Usage

### Project Scan
Scan all dependencies listed in `package.json` and analyze installed `node_modules`.

```bash
typoguard scan .
```

### CI/CD Integration
Generate a machine-readable report for automated analysis.

```bash
typoguard scan . --json > typoguard-report.json
```

### Preinstall Enforcement
Block installations if high-risk threats (typosquats or high-risk local scripts) are detected. Add this to your `package.json`:

```json
{
  "scripts": {
    "preinstall": "typoguard preinstall"
  }
}
```

## Detection Heuristics

### Typosquatting
- **High Confidence**: Distance 1 (e.g., `lodash` vs `lodaash`).
- **Medium Confidence**: Distance 2 for strings longer than 4 characters (e.g., `axios` vs `axois`).

### Dangerous Scripts
- **High Risk**: Remote execution (`curl`, `wget` piped to `sh`), environment variable exfiltration (`env |`), or sensitive file access (`/etc/passwd`).
- **Medium Risk**: Arbitrary code execution (`node -e`), binary permission changes (`chmod +x`), or direct shell execution.

### Heuristics
- **New Packages**: Dependencies created within the last 30 days.
- **Single Maintainers**: Projects with only one authorized publisher.
- **Placeholder Metadata**: Packages with extremely short descriptions or missing fields.

## License

MIT [LICENSE](LICENSE)
