import { PackageMetadata } from '../utils/npm';

export interface HeuristicRisk {
  package: string;
  riskLevel: 'medium' | 'low';
  reason: string;
}

export function analyzeHeuristics(metadata: PackageMetadata): HeuristicRisk[] {
  const risks: HeuristicRisk[] = [];
  
  if (!metadata.created) return risks;

  const createdDate = new Date(metadata.created);
  const now = new Date();
  const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);

  // 1. Very new package
  if (ageInDays < 30) {
    risks.push({
      package: metadata.name,
      riskLevel: 'medium',
      reason: `Package is very new (${Math.round(ageInDays)} days old)`
    });
  }

  // 2. Few maintainers
  if (metadata.maintainers.length <= 1) {
    risks.push({
      package: metadata.name,
      riskLevel: 'low',
      reason: "Single maintainer project"
    });
  }

  // 3. Placeholder description
  if (metadata.description.length < 10) {
    risks.push({
      package: metadata.name,
      riskLevel: 'low',
      reason: "Very short/missing description"
    });
  }

  return risks;
}
