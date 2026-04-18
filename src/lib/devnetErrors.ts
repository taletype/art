export type BlockerCode =
  | "MISSING_ENV"
  | "INVALID_PUBLIC_KEY"
  | "INVALID_ASSET_ID"
  | "UNSUPPORTED_BRANCH"
  | "RPC_UNAVAILABLE"
  | "SDK_BUILD_FAILED"
  | "ACCOUNT_DERIVATION_FAILED";

export interface BlockingIssue {
  code: BlockerCode;
  message: string;
  action?: string;
  details?: Record<string, string>;
}

export function missingEnvIssue(envVar: string, context: string): BlockingIssue {
  return {
    code: "MISSING_ENV",
    message: `Missing required env var ${envVar} for ${context}.`,
    action: `Set ${envVar} in .env.local and restart the server.`,
    details: { envVar, context },
  };
}

export function rpcIssue(context: string, reason: string): BlockingIssue {
  return {
    code: "RPC_UNAVAILABLE",
    message: `RPC unavailable while ${context}: ${reason}`,
    action: "Verify SOLANA_RPC_URL, network access, and RPC health.",
    details: { context, reason },
  };
}

export function issueToMessage(issue: BlockingIssue): string {
  return `${issue.code}: ${issue.message}`;
}

export function issuesToMessages(issues: BlockingIssue[]): string[] {
  return issues.map(issueToMessage);
}
