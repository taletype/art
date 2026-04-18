#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactDir = resolve(process.cwd(), process.env.READINESS_ARTIFACT_DIR ?? 'artifacts/readiness-v2');
mkdirSync(artifactDir, { recursive: true });

const expected = {
  fundedBinaryProofSummary: resolve(artifactDir, 'funded-binary-proof-summary.json'),
  fundedMultiProofSummary: resolve(artifactDir, 'funded-multi-proof-summary.json'),
  deployCandidateSmokeEvidenceJson: resolve(artifactDir, 'deploy-candidate-smoke-evidence.json'),
  deployCandidateSmokeEvidenceMd: resolve(artifactDir, 'deploy-candidate-smoke-evidence.md'),
  readinessVerdictJson: resolve(artifactDir, 'readiness-verdict.json'),
  readinessVerdictMd: resolve(artifactDir, 'readiness-verdict.md'),
};

const missing = Object.entries(expected).filter(([, p]) => !existsSync(p));
if (missing.length > 0) {
  console.error('❌ readiness:v2:run failed. Missing required artifacts:');
  for (const [name, p] of missing) console.error(`- ${name}: ${p}`);
  process.exit(1);
}

let verdict = 'INCOMPLETE';
let phases = [];
let smokeMode = process.env.READINESS_SMOKE_MODE ?? 'validate';

try {
  const verdictJson = JSON.parse(readFileSync(expected.readinessVerdictJson, 'utf8'));
  verdict = verdictJson.verdict ?? verdict;
  phases = Array.isArray(verdictJson.phasesRan) ? verdictJson.phasesRan : [];
  smokeMode = verdictJson.smokeMode ?? smokeMode;
} catch (error) {
  console.error(`❌ readiness:v2:run failed. Could not parse readiness verdict JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const summary = {
  verdict,
  artifactDir,
  smokeMode,
  phasesRan: phases,
  reports: expected,
  generatedAt: new Date().toISOString(),
};

const markerFile = resolve(artifactDir, 'bundle-complete.json');
writeFileSync(markerFile, JSON.stringify(summary, null, 2));
const summaryFile = resolve(artifactDir, 'readiness-run-summary.json');
writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

console.log('\n=== V2 Readiness Summary ===');
console.log(`Final verdict: ${verdict}`);
console.log(`Artifact directory: ${artifactDir}`);
console.log(`Smoke mode: ${smokeMode}`);
console.log(`Phases ran: ${phases.length ? phases.join(', ') : 'not declared'}`);
console.log('Reports:');
for (const [name, p] of Object.entries(expected)) console.log(`- ${name}: ${p}`);
console.log(`- bundleMarker: ${markerFile}`);
console.log(`- runSummary: ${summaryFile}`);
