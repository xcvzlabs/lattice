import type { RequestLogListResponse } from '@lattice/api-contract';
import { defineHandler, type H3Event } from 'nitro';
import {
  listRequestLogs,
  type ListRequestLogsOptions,
} from '../../../../database/repositories/request-logs.ts';
import { toRequestLogDto } from '../../../../management/serializers.ts';
import { createLatticeError } from '../../../../utils/errors.ts';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function isRequestStatus(value: string): value is 'success' | 'error' {
  return value === 'success' || value === 'error';
}

function parseLimit(raw: string | null): number {
  if (raw === null) return DEFAULT_LIMIT;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    throw createLatticeError(
      400,
      'invalid_request',
      `"limit" must be an integer between 1 and ${MAX_LIMIT}`,
    );
  }

  return parsed;
}

function parseOffset(raw: string | null): number {
  if (raw === null) return 0;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createLatticeError(400, 'invalid_request', '"offset" must be a non-negative integer');
  }

  return parsed;
}

function parseDate(raw: string | null, field: string): Date | undefined {
  if (raw === null) return undefined;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw createLatticeError(400, 'invalid_request', `"${field}" must be a valid ISO date`);
  }

  return parsed;
}

function parseOptions(event: H3Event): ListRequestLogsOptions {
  const params = event.url.searchParams;
  const status = params.get('status');

  if (status !== null && !isRequestStatus(status)) {
    throw createLatticeError(400, 'invalid_request', '"status" must be "success" or "error"');
  }

  return {
    applicationId: params.get('applicationId') ?? undefined,
    model: params.get('model') ?? undefined,
    provider: params.get('provider') ?? undefined,
    status: status ?? undefined,
    since: parseDate(params.get('since'), 'since'),
    until: parseDate(params.get('until'), 'until'),
    limit: parseLimit(params.get('limit')),
    offset: parseOffset(params.get('offset')),
  };
}

export default defineHandler(async (event: H3Event): Promise<RequestLogListResponse> => {
  const options = parseOptions(event);
  const logs = await listRequestLogs(options);

  return { data: logs.map(toRequestLogDto), limit: options.limit, offset: options.offset };
});
