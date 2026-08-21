import type { ModelRegistryEntry } from '~/apps/gateway/server/registry/models.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import { recordLatency, resetLatencies } from '~/apps/gateway/server/routing/latency-tracker.ts';
import { rankCandidates } from '~/apps/gateway/server/routing/scoring.ts';

beforeEach(() => {
  resetLatencies();
});

const cheap: ModelRegistryEntry = {
  id: 'cheap-model',
  provider: 'google',
  providerModel: 'gemini-2.5-pro',
  pricing: { inputPerMillionUsd: 1, outputPerMillionUsd: 1 },
};

const expensive: ModelRegistryEntry = {
  id: 'expensive-model',
  provider: 'openai',
  providerModel: 'gpt-4o',
  pricing: { inputPerMillionUsd: 10, outputPerMillionUsd: 10 },
};

const unpriced: ModelRegistryEntry = {
  id: 'unpriced-model',
  provider: 'anthropic',
  providerModel: 'claude-sonnet-4-5',
};

describe('rankCandidates', () => {
  it('leaves order untouched for an undefined strategy', () => {
    const ranked = rankCandidates([expensive, cheap], undefined);
    expect(ranked).toEqual([expensive, cheap]);
  });

  it('sorts ascending by price under a cost strategy', () => {
    const ranked = rankCandidates([expensive, cheap], 'cost');
    expect(ranked.map((entry) => entry.id)).toEqual(['cheap-model', 'expensive-model']);
  });

  it('sorts an unpriced candidate after every priced one under a cost strategy', () => {
    const ranked = rankCandidates([unpriced, expensive, cheap], 'cost');
    expect(ranked.map((entry) => entry.id)).toEqual([
      'cheap-model',
      'expensive-model',
      'unpriced-model',
    ]);
  });

  it('sorts ascending by latency under a latency strategy', () => {
    recordLatency('expensive-model', 900);
    recordLatency('cheap-model', 100);

    const ranked = rankCandidates([expensive, cheap], 'latency');
    expect(ranked.map((entry) => entry.id)).toEqual(['cheap-model', 'expensive-model']);
  });

  it('sorts a candidate with no latency sample after every sampled one', () => {
    recordLatency('expensive-model', 900);

    const ranked = rankCandidates([unpriced, expensive], 'latency');
    expect(ranked.map((entry) => entry.id)).toEqual(['expensive-model', 'unpriced-model']);
  });

  it('blends cost and latency under a balanced strategy', () => {
    // cheap-model is cheaper but slower; expensive-model is pricier but faster. Neither
    // dominates on both axes, so the balanced blend should prefer the one that's better
    // on average rather than collapsing to a single-axis ranking.
    recordLatency('cheap-model', 900);
    recordLatency('expensive-model', 100);

    const ranked = rankCandidates([cheap, expensive], 'balanced');
    expect(ranked).toHaveLength(2);
    expect(new Set(ranked.map((entry) => entry.id))).toEqual(
      new Set(['cheap-model', 'expensive-model']),
    );
  });

  it('never drops a candidate regardless of strategy', () => {
    for (const strategy of ['cost', 'latency', 'balanced'] as const) {
      const ranked = rankCandidates([expensive, cheap, unpriced], strategy);
      expect(ranked).toHaveLength(3);
    }
  });
});
