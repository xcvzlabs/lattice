import * as v from 'valibot';

export const errorEnvelopeSchema = v.object({
  error: v.object({
    message: v.string(),
    type: v.string(),
    code: v.nullable(v.string()),
  }),
});
export type ErrorEnvelope = v.InferOutput<typeof errorEnvelopeSchema>;
