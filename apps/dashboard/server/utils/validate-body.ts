import type { H3Event } from 'h3';
import type { BaseIssue, BaseSchema } from 'valibot';
import * as v from 'valibot';

/** Parses the request body against `schema`, throwing a 400 on failure. The gateway validates
 * independently on arrival — this only rejects a malformed request earlier, with a clearer
 * message, instead of forwarding it as an opaque payload. Named distinctly from h3's own
 * `readValidatedBody` (auto-imported) so this one doesn't silently shadow it. */
export async function readValibotBody<TOutput>(
  event: H3Event,
  schema: BaseSchema<unknown, TOutput, BaseIssue<unknown>>,
): Promise<TOutput> {
  const rawBody: unknown = await readBody<unknown>(event);
  const parsed = v.safeParse(schema, rawBody);

  if (!parsed.success) {
    throw createError({ status: 400, statusMessage: v.summarize(parsed.issues) });
  }

  return parsed.output;
}
