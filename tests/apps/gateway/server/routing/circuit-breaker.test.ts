import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  currentState,
  recordFailure,
  recordSuccess,
  resetCircuits,
} from '~/apps/gateway/server/routing/circuit-breaker.ts';

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 30_000;

beforeEach(() => {
  resetCircuits();
  vi.useRealTimers();
});

describe('currentState', () => {
  it('starts closed for a provider with no recorded outcomes', () => {
    expect(currentState('openai')).toBe('closed');
  });

  it('stays closed below the failure threshold', () => {
    for (let count = 0; count < FAILURE_THRESHOLD - 1; count += 1) recordFailure('openai');
    expect(currentState('openai')).toBe('closed');
  });

  it('opens once consecutive failures reach the threshold', () => {
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) recordFailure('openai');
    expect(currentState('openai')).toBe('open');
  });

  it('closes again after a success resets the failure count', () => {
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) recordFailure('openai');
    recordSuccess('openai');
    expect(currentState('openai')).toBe('closed');
  });

  it('moves from open to half-open once the cooldown elapses', () => {
    vi.useFakeTimers();
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) recordFailure('openai');
    expect(currentState('openai')).toBe('open');

    vi.advanceTimersByTime(COOLDOWN_MS);
    expect(currentState('openai')).toBe('half-open');
  });

  it('tracks each provider independently', () => {
    for (let count = 0; count < FAILURE_THRESHOLD; count += 1) recordFailure('openai');
    expect(currentState('openai')).toBe('open');
    expect(currentState('anthropic')).toBe('closed');
  });
});
