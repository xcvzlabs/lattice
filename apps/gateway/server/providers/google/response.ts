import type { ChatCompletionResponse, FinishReason } from '@lattice/api-contract';
import * as v from 'valibot';

const geminiCandidateSchema = v.object({
  content: v.object({
    parts: v.array(v.object({ text: v.optional(v.string()) })),
  }),
  finishReason: v.optional(v.string()),
});

export const geminiResponseSchema = v.object({
  candidates: v.pipe(v.array(geminiCandidateSchema), v.minLength(1)),
  usageMetadata: v.object({
    promptTokenCount: v.number(),
    candidatesTokenCount: v.number(),
    totalTokenCount: v.number(),
  }),
});
export type GeminiResponse = v.InferOutput<typeof geminiResponseSchema>;

function toFinishReason(reason: string | undefined): FinishReason {
  if (reason === 'MAX_TOKENS') return 'length';
  if (reason === 'SAFETY') return 'content_filter';
  return 'stop';
}

function toContentText(candidate: GeminiResponse['candidates'][number]): string {
  return candidate.content.parts.map((part) => part.text ?? '').join('');
}

export function fromGeminiResponse(parsed: GeminiResponse, model: string): ChatCompletionResponse {
  const [candidate] = parsed.candidates;

  if (candidate === undefined) {
    throw new Error('Gemini response contained no candidates');
  }

  return {
    id: `gemini-${Bun.randomUUIDv7()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: toContentText(candidate) },
        finish_reason: toFinishReason(candidate.finishReason),
      },
    ],
    usage: {
      prompt_tokens: parsed.usageMetadata.promptTokenCount,
      completion_tokens: parsed.usageMetadata.candidatesTokenCount,
      total_tokens: parsed.usageMetadata.totalTokenCount,
    },
  };
}
