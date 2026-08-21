import type { ChatCompletionChunk, FinishReason } from '@lattice/api-contract';
import * as v from 'valibot';

const geminiCandidateSchema = v.object({
  content: v.object({
    parts: v.array(v.object({ text: v.optional(v.string()) })),
  }),
  finishReason: v.optional(v.string()),
});

export const geminiChunkSchema = v.object({
  candidates: v.pipe(v.array(geminiCandidateSchema), v.minLength(1)),
  // Present only on the terminal chunk; intermediate chunks omit it entirely.
  usageMetadata: v.optional(
    v.object({
      promptTokenCount: v.number(),
      candidatesTokenCount: v.number(),
      totalTokenCount: v.number(),
    }),
  ),
});
export type GeminiChunk = v.InferOutput<typeof geminiChunkSchema>;

function toFinishReason(reason: string | undefined): FinishReason | null {
  if (reason === undefined) return null;
  if (reason === 'MAX_TOKENS') return 'length';
  if (reason === 'SAFETY') return 'content_filter';
  return 'stop';
}

function toContentText(candidate: GeminiChunk['candidates'][number]): string {
  return candidate.content.parts.map((part) => part.text ?? '').join('');
}

/**
 * Each Gemini streaming chunk carries the same shape as the full response (unlike Anthropic's
 * multi-event protocol), so this is a stateless mapper rather than a reducer over stream state.
 */
export function parseGeminiChunk(parsed: GeminiChunk, model: string): ChatCompletionChunk {
  const [candidate] = parsed.candidates;

  if (candidate === undefined) {
    throw new Error('Gemini chunk contained no candidates');
  }

  return {
    id: `gemini-${Bun.randomUUIDv7()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta: { role: 'assistant', content: toContentText(candidate) },
        finish_reason: toFinishReason(candidate.finishReason),
      },
    ],
    usage: parsed.usageMetadata
      ? {
          prompt_tokens: parsed.usageMetadata.promptTokenCount,
          completion_tokens: parsed.usageMetadata.candidatesTokenCount,
          total_tokens: parsed.usageMetadata.totalTokenCount,
        }
      : undefined,
  };
}
