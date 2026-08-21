import { errorEnvelopeSchema } from '@lattice/api-contract';
import * as v from 'valibot';
import { env } from '~~/server/utils/env.ts';

export type GatewayRequestInit = {
  method?: string;
  body?: unknown;
};

/** Server-only: calls the gateway's `/management/v1/**` API with the dashboard's service
 * credential. Never invoke this from client-side code — the management key must never reach
 * the browser. Throws H3's `createError` on a non-OK response, so callers can let it propagate
 * straight to Nuxt's default error handler instead of translating it themselves. */
export async function gatewayFetch<T>(path: string, init: GatewayRequestInit = {}): Promise<T> {
  const authHeaders = { authorization: `Bearer ${env.latticeManagementApiKey}` };
  const headers =
    init.body === undefined ? authHeaders : { ...authHeaders, 'content-type': 'application/json' };

  const response = await fetch(`${env.latticeGatewayUrl}/management/v1${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  if (!response.ok) {
    const rawBody: unknown = await response.json().catch(() => undefined);
    const parsedBody = v.safeParse(errorEnvelopeSchema, rawBody);
    const statusMessage = parsedBody.success
      ? parsedBody.output.error.message
      : `Gateway request to "${path}" failed (${response.status})`;

    throw createError({ status: response.status, statusMessage });
  }

  return response.json();
}
