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

const requiredJsonReports = {
  fundedBinaryProofSummary: expected.fundedBinaryProofSummary,
  fundedMultiProofSummary: expected.fundedMultiProofSummary,
  deployCandidateSmokeEvidenceJson: expected.deployCandidateSmokeEvidenceJson,
  readinessVerdictJson: expected.readinessVerdictJson,
};

const requiredMarkdownReports = {
  deployCandidateSmokeEvidenceMd: expected.deployCandidateSmokeEvidenceMd,
  readinessVerdictMd: expected.readinessVerdictMd,
};

const missing = Object.entries(expected).filter(([, p]) => !existsSync(p));
if (missing.length > 0) {
  console.error('❌ readiness:v2:run failed. Missing required artifacts:');
  for (const [name, p] of missing) console.error(`- ${name}: ${p}`);
  process.exit(1);
}

const emptyMarkdownReports = Object.entries(requiredMarkdownReports).filter(
  ([, p]) => readFileSync(p, 'utf8').trim().length === 0,
);
if (emptyMarkdownReports.length > 0) {
  console.error('❌ readiness:v2:run failed. Empty required markdown artifacts:');
  for (const [name, p] of emptyMarkdownReports) console.error(`- ${name}: ${p}`);
  process.exit(1);
}

function readJsonReport(name, path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    console.error(`❌ readiness:v2:run failed. Could not parse ${name}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function requireJsonObject(name, value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  console.error(`❌ readiness:v2:run failed. ${name} must be a JSON object.`);
  process.exit(1);
}

const parsedReports = Object.fromEntries(
  Object.entries(requiredJsonReports).map(([name, path]) => [name, readJsonReport(name, path)]),
);

let verdict = 'INCOMPLETE';
let phases = [];
let smokeMode = process.env.READINESS_SMOKE_MODE ?? 'validate';

const verdictJson = requireJsonObject('readinessVerdictJson', parsedReports.readinessVerdictJson);
verdict = verdictJson.verdict ?? verdict;
phases = Array.isArray(verdictJson.phasesRan) ? verdictJson.phasesRan : [];
smokeMode = verdictJson.smokeMode ?? smokeMode;

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