import { describe, expect, it } from "vitest";
import { issueToMessage, missingEnvIssue, rpcIssue } from "../devnetErrors";

describe("devnet error shaping", () => {
  it("formats missing env issue consistently", () => {
    const issue = missingEnvIssue("SOLANA_RPC_URL", "mint prepare");
    expect(issue.code).toBe("MISSING_ENV");
    expect(issueToMessage(issue)).toContain("SOLANA_RPC_URL");
  });

  it("formats rpc issue consistently", () => {
    const issue = rpcIssue("fetching blockhash", "timeout");
    expect(issue.code).toBe("RPC_UNAVAILABLE");
    expect(issue.message).toContain("timeout");
  });
});
