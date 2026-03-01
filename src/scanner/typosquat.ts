import * as levenshtein from 'fast-levenshtein';
import { TOP_PACKAGES } from '../utils/top-packages';

export interface TyposquatResult {
  requested: string;
  potentialMatch: string;
  confidence: number;
  recommendation: string;
}

export function detectTyposquats(dependencies: string[]): TyposquatResult[] {
  const results: TyposquatResult[] = [];
  const topPackagesSet = new Set(TOP_PACKAGES);

  for (const dep of dependencies) {
    // If it's already in the top packages, skip
    if (topPackagesSet.has(dep)) continue;

    for (const topPkg of TOP_PACKAGES) {
      const distance = levenshtein.get(dep, topPkg);
      
      // Heuristics for typosquatting:
      // 1. Distance of 1 (e.g., "express" vs "experss")
      // 2. Distance of 2 if length is > 4 (e.g., "axios" vs "axois" is distance 2 due to transposition)
      if (distance === 1 || (distance === 2 && dep.length > 4)) {
        // Calculate a simple confidence score
        // Distance 1 = high confidence (95%)
        // Distance 2 = medium confidence (75%)
        const confidence = distance === 1 ? 0.95 : 0.75;
        
        results.push({
          requested: dep,
          potentialMatch: topPkg,
          confidence: Math.round(confidence * 100),
          recommendation: `Use the official '${topPkg}' package instead of '${dep}'.`
        });
        
        // Break once we find a likely match to avoid noise
        break;
      }
    }
  }

  return results;
}
