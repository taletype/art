import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];

function makeArtifactDir() {
  const artifactDir = mkdtempSync(join(tmpdir(), "readiness-v2-"));
  tempDirs.push(artifactDir);
  return artifactDir;
}

function makeMissingArtifactDir() {
  const parentDir = mkdtempSync(join(tmpdir(), "readiness-v2-parent-"));
  tempDirs.push(parentDir);
  return join(parentDir, "missing-bundle");
}

function runReadiness(artifactDir: string) {
  return spawnSync(process.execPath, [join(process.cwd(), "scripts/readiness-v2-run.mjs")], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      READINESS_ARTIFACT_DIR: artifactDir,
    },
  });
}

function writeValidBundle(artifactDir: string) {
  writeFileSync(join(artifactDir, "funded-binary-proof-summary.json"), JSON.stringify({ ok: true }));
  writeFileSync(join(artifactDir, "funded-multi-proof-summary.json"), JSON.stringify({ ok: true }));
  writeFileSync(join(artifactDir, "deploy-candidate-smoke-evidence.json"), JSON.stringify({ ok: true }));
  writeFileSync(join(artifactDir, "deploy-candidate-smoke-evidence.md"), "# Smoke evidence\n");
  writeFileSync(
    join(artifactDir, "readiness-verdict.json"),
    JSON.stringify({
      verdict: "READY",
      phasesRan: ["funded-binary-proof", "funded-multi-proof", "deploy-candidate-smoke"],
      smokeMode: "deploy-candidate",
    }),
  );
  writeFileSync(join(artifactDir, "readiness-verdict.md"), "# Readiness verdict\n");
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

describe("readiness-v2 runner", () => {
  it("writes completion summaries for a valid readiness bundle", () => {
    const artifactDir = makeArtifactDir();
    writeValidBundle(artifactDir);

    const result = runReadiness(artifactDir);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Final verdict: READY");
    expect(result.stdout).toContain("Smoke mode: deploy-candidate");

    const bundleSummary = JSON.parse(readFileSync(join(artifactDir, "bundle-complete.json"), "utf8"));
    const runSummary = JSON.parse(readFileSync(join(artifactDir, "readiness-run-summary.json"), "utf8"));

    expect(bundleSummary).toEqual(runSummary);
    expect(bundleSummary).toMatchObject({
      artifactDir,
      smokeMode: "deploy-candidate",
      verdict: "READY",
      phasesRan: ["funded-binary-proof", "funded-multi-proof", "deploy-candidate-smoke"],
      reports: {
        fundedBinaryProofSummary: join(artifactDir, "funded-binary-proof-summary.json"),
        fundedMultiProofSummary: join(artifactDir, "funded-multi-proof-summary.json"),
        deployCandidateSmokeEvidenceJson: join(artifactDir, "deploy-candidate-smoke-evidence.json"),
        deployCandidateSmokeEvidenceMd: join(artifactDir, "deploy-candidate-smoke-evidence.md"),
        readinessVerdictJson: join(artifactDir, "readiness-verdict.json"),
        readinessVerdictMd: join(artifactDir, "readiness-verdict.md"),
      },
    });
    expect(typeof bundleSummary.generatedAt).toBe("string");
  });

  it("fails with a clear missing-artifact message when the bundle is incomplete", () => {
    const artifactDir = makeArtifactDir();

    const result = runReadiness(artifactDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("readiness:v2:run failed. Missing required artifacts:");
    expect(result.stderr).toContain("fundedBinaryProofSummary");
    expect(result.stderr).toContain(join(artifactDir, "funded-binary-proof-summary.json"));
  });

  it("does not create the artifact directory when the bundle path is missing", () => {
    const artifactDir = makeMissingArtifactDir();

    const result = runReadiness(artifactDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("readiness:v2:run failed. Missing required artifacts:");
    expect(existsSync(artifactDir)).toBe(false);
  });

  it("fails with a clear parse message when a JSON artifact is invalid", () => {
    const artifactDir = makeArtifactDir();
    writeValidBundle(artifactDir);
    writeFileSync(join(artifactDir, "readiness-verdict.json"), "{not valid json");

    const result = runReadiness(artifactDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("readiness:v2:run failed. Could not parse readinessVerdictJson:");
  });

  it("fails with a clear empty-artifact message when a markdown report is blank", () => {
    const artifactDir = makeArtifactDir();
    writeValidBundle(artifactDir);
    writeFileSync(join(artifactDir, "readiness-verdict.md"), " \n");

    const result = runReadiness(artifactDir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("readiness:v2:run failed. Empty required markdown artifacts:");
    expect(result.stderr).toContain("readinessVerdictMd");
    expect(result.stderr).toContain(join(artifactDir, "readiness-verdict.md"));
  });
});