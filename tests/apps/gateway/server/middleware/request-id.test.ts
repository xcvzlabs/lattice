import { describe, expect, it } from 'vitest';
import requestIdMiddleware from '~/apps/gateway/server/middleware/01.request-id.ts';
import { getRequestId } from '~/apps/gateway/server/utils/request-context.ts';
import { mockEvent, noopNext } from '~/apps/gateway/test-support/mock-event.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('request-id middleware', () => {
  it('assigns a UUID request id to the event, retrievable via getRequestId', async () => {
    const event = mockEvent('http://localhost/v1/chat/completions');

    await requestIdMiddleware(event, noopNext);

    expect(getRequestId(event.req)).toMatch(UUID_PATTERN);
  });

  it('assigns a different id to each request', async () => {
    const first = mockEvent('http://localhost/v1/chat/completions');
    const second = mockEvent('http://localhost/v1/chat/completions');

    await requestIdMiddleware(first, noopNext);
    await requestIdMiddleware(second, noopNext);

    expect(getRequestId(first.req)).not.toBe(getRequestId(second.req));
  });
});
