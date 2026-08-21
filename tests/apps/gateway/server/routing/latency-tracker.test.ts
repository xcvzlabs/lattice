import { beforeEach, describe, expect, it } from 'vitest';
import {
  averageLatency,
  recordLatency,
  resetLatencies,
} from '~/apps/gateway/server/routing/latency-tracker.ts';

beforeEach(() => {
  resetLatencies();
});

describe('averageLatency', () => {
  it('is undefined for a model with no recorded samples', () => {
    expect(averageLatency('gpt-4o')).toBeUndefined();
  });

  it('equals the first sample exactly', () => {
    recordLatency('gpt-4o', 200);
    expect(averageLatency('gpt-4o')).toBe(200);
  });

  it('moves the average toward a second, different sample without jumping to it', () => {
    recordLatency('gpt-4o', 200);
    recordLatency('gpt-4o', 1000);

    const average = averageLatency('gpt-4o');
    expect(average).toBeGreaterThan(200);
    expect(average).toBeLessThan(1000);
  });

  it('tracks each model independently', () => {
    recordLatency('gpt-4o', 200);
    recordLatency('claude-sonnet', 900);

    expect(averageLatency('gpt-4o')).toBe(200);
    expect(averageLatency('claude-sonnet')).toBe(900);
  });
});
