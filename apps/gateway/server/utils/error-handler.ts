import type { ErrorEnvelope } from '@lattice/api-contract';
import { defineErrorHandler } from 'nitro';
import * as v from 'valibot';
import { errorType, latticeErrorDataSchema } from './errors.ts';

// `event` here is typed as the narrower HTTPEvent (no `.context`), unlike regular handlers or
// middleware. Request-id correlation for error responses happens via structured logs at the
// throw site (which has full H3Event access), not a response header set from this callback.
export default defineErrorHandler((error, _event) => {
  const parsedData = v.safeParse(latticeErrorDataSchema, error.data);
  const code = parsedData.success ? parsedData.output.code : null;
  const message = error.unhandled === true ? 'Internal server error' : error.message;
  const body: ErrorEnvelope = {
    error: {
      message,
      type: errorType(error.status),
      code,
    },
  };

  return new Response(JSON.stringify(body), {
    status: error.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
});
