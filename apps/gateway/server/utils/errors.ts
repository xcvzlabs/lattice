import { HTTPError } from 'nitro';
import * as v from 'valibot';

export type LatticeErrorCode =
  | 'missing_api_key'
  | 'invalid_api_key'
  | 'revoked_api_key'
  | 'model_not_found'
  | 'unsupported_parameter'
  | 'invalid_request'
  | 'provider_error'
  | 'all_providers_failed'
  | 'model_registry_invalid'
  | 'invalid_env';

export type LatticeErrorData = {
  code: LatticeErrorCode;
};

export function createLatticeError(
  status: number,
  code: LatticeErrorCode,
  message: string,
): HTTPError<LatticeErrorData> {
  return new HTTPError({ status, message, data: { code } });
}

/** Maps an HTTP status to an OpenAI-style error `type` category for client compatibility. */
export function errorType(status: number): string {
  if (status === 401) return 'authentication_error';
  if (status === 403) return 'permission_error';
  if (status === 404) return 'not_found_error';
  if (status === 429) return 'rate_limit_error';
  if (status >= 500) return 'upstream_error';
  return 'invalid_request_error';
}

const latticeErrorDataSchema = v.object({ code: v.string() });

export type ErrorLogFields = {
  status: number;
  code: string | null;
};

/** Extracts the fields worth putting in a structured log line from a caught dispatch error. */
export function toErrorLogFields(cause: unknown): ErrorLogFields {
  if (!HTTPError.isError(cause)) return { status: 500, code: null };
  const parsed = v.safeParse(latticeErrorDataSchema, cause.data);
  return { status: cause.status, code: parsed.success ? parsed.output.code : null };
}
