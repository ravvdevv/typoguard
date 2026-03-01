#!/usr/bin/env bun
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import pc from 'picocolors';
import { detectTyposquats } from './scanner/typosquat';
import { scanScripts } from './scanner/scripts';
import { getPackageMetadata } from './utils/npm';
import { analyzeHeuristics } from './scanner/heuristics';
import { TOP_PACKAGES } from './utils/top-packages';

const program = new Command();

program
  .name('typoguard')
  .description('A CLI tool to detect typosquatting and dangerous scripts in dependencies')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan dependencies for potential threats')
  .argument('[dir]', 'Project directory to scan', '.')
  .option('--json', 'Output results in JSON format')
  .action(async (dir, options) => {
    const projectPath = path.resolve(dir);
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.error(pc.red(`Error: package.json not found in ${projectPath}`));
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const depNames = Object.keys(dependencies);
    
    console.log(pc.cyan(`Scanning ${depNames.length} dependencies...\n`));

    // 1. Typosquat Detection
    const typosquats = detectTyposquats(depNames);
    
    // 2. Local scripts scan (for the current project)
    const localRisks = scanScripts(packageJson);

    // 3. Scan installed dependencies if node_modules exists
    const depRisks: any[] = [];
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      for (const dep of depNames) {
        const depPkgPath = path.join(nodeModulesPath, dep, 'package.json');
        if (fs.existsSync(depPkgPath)) {
          const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
          const risks = scanScripts(depPkg);
          depRisks.push(...risks);
        }
      }
    } else {
      console.warn(pc.yellow('Warning: node_modules not found. Skipping dependency script scan.\n'));
    }

    // 4. Heuristics (Network calls)
    const heuristicsRisks: any[] = [];
    const topPackagesSet = new Set(TOP_PACKAGES);
    const unknownDeps = depNames.filter(d => !topPackagesSet.has(d));

    if (unknownDeps.length > 0) {
      console.log(pc.cyan(`Analyzing metadata for ${unknownDeps.length} unknown packages (via npm view)...\n`));
      for (const dep of unknownDeps) {
        const metadata = getPackageMetadata(dep);
        if (metadata) {
          const hRisks = analyzeHeuristics(metadata);
          heuristicsRisks.push(...hRisks);
        }
      }
    }

    if (options.json) {
      console.log(JSON.stringify({ typosquats, localRisks, depRisks, heuristicsRisks }, null, 2));
      return;
    }

    // Display Results
    if (typosquats.length > 0) {
      console.log(pc.yellow('⚠️ Potential Typosquat detected:'));
      typosquats.forEach(res => {
        console.log(`  - Requested: ${pc.bold(res.requested)}`);
        console.log(`    Did you mean: ${pc.green(res.potentialMatch)}?`);
        console.log(`    Confidence: ${res.confidence}%`);
        console.log(`    Recommendation: ${pc.cyan(res.recommendation)}\n`);
      });
    } else {
      console.log(pc.green('✅ No typosquats detected.'));
    }

    if (localRisks.length > 0 || depRisks.length > 0) {
      console.log(pc.red('\n⚠️ Dangerous install scripts detected:'));
      [...localRisks, ...depRisks].forEach(risk => {
        console.log(`  - Package: ${pc.bold(risk.package)}`);
        console.log(`    Script: ${pc.yellow(risk.scriptType)} => ${pc.gray(risk.command)}`);
        console.log(`    Reason: ${pc.red(risk.reason)}`);
        console.log(`    Risk Level: ${risk.riskLevel.toUpperCase()}`);
        console.log(`    Recommendation: ${pc.cyan(risk.recommendation)}\n`);
      });
    } else {
      console.log(pc.green('✅ No dangerous scripts detected in installed dependencies.'));
    }

    if (heuristicsRisks.length > 0) {
      console.log(pc.yellow('\n⚠️ Suspicious package heuristics:'));
      heuristicsRisks.forEach(risk => {
        console.log(`  - Package: ${pc.bold(risk.package)}`);
        console.log(`    Reason: ${pc.yellow(risk.reason)}`);
        console.log(`    Risk Level: ${risk.riskLevel.toUpperCase()}\n`);
      });
    } else {
      console.log(pc.green('✅ No suspicious heuristics found.'));
    }
  });

program
  .command('preinstall')
  .description('Run as a preinstall hook to block dangerous packages')
  .action(async () => {
    const projectPath = process.cwd();
    const packageJsonPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      console.error(pc.red('Error: package.json not found'));
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    const depNames = Object.keys(dependencies);
    const typosquats = detectTyposquats(depNames);

    if (typosquats.length > 0) {
      console.error(pc.red('\n🛑 Installation blocked! Potential Typosquats detected:'));
      typosquats.forEach(res => {
        console.error(`  - Requested: ${pc.bold(res.requested)} (Maybe ${pc.green(res.potentialMatch)}?)`);
      });
      console.error(pc.yellow('\nPlease verify these dependencies before proceeding.'));
      process.exit(1);
    }

    const localRisks = scanScripts(packageJson);
    const highRiskLocal = localRisks.filter(r => r.riskLevel === 'high');

    if (highRiskLocal.length > 0) {
      console.error(pc.red('\n🛑 Installation blocked! Dangerous scripts detected in your package.json:'));
      highRiskLocal.forEach(risk => {
        console.error(`  - Script: ${pc.yellow(risk.scriptType)} => ${pc.gray(risk.command)}`);
        console.error(`    Reason: ${pc.red(risk.reason)}`);
      });
      process.exit(1);
    }

    console.log(pc.green('✅ TypoGuard: Preinstall check passed.'));
  });

program.parse(process.argv);
