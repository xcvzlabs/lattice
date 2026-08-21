export type EnvIssue = {
  readonly envVar: string;
  readonly path: string;
  readonly message: string;
};

function formatMessage(issues: readonly EnvIssue[]): string {
  const lines = issues.map((issue) => `  - ${issue.envVar}: ${issue.message}`);
  return `Invalid environment variables:\n${lines.join('\n')}`;
}

/** Thrown by `defineEnv` when one or more environment variables fail schema validation. */
export class EnvValidationError extends Error {
  readonly code = 'ENV_VALIDATION_ERROR';
  readonly issues: readonly EnvIssue[];

  constructor(issues: readonly EnvIssue[]) {
    super(formatMessage(issues));
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}
