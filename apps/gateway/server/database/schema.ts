import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const routingStrategyEnum = pgEnum('routing_strategy', ['cost', 'latency', 'balanced']);
export const requestStatusEnum = pgEnum('request_status', ['success', 'error']);

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Nullable overrides: null means unlimited.
  monthlyTokenQuota: integer('monthly_token_quota'),
  rateLimitPerMinute: integer('rate_limit_per_minute'),
  // Null means the application is active. Checked alongside api_keys.revokedAt so disabling an
  // application takes every one of its keys down immediately without revoking them individually.
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  // Null means unrestricted (every registry model/alias is callable). Entries are matched
  // against the raw `model` field the client sends, before alias resolution.
  allowedModels: text('allowed_models').array(),
  // Null means the registry's static fallback order is used as-is (today's behavior).
  routingStrategy: routingStrategyEnum('routing_strategy'),
});

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
    index('api_keys_application_id_idx').on(table.applicationId),
  ],
);

export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    // Nullable: not every provider reports usage on every streamed response. A null here
    // means "usage unknown for this request," not zero.
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('usage_records_application_id_idx').on(table.applicationId)],
);

export const applicationUsageCounters = pgTable(
  'application_usage_counters',
  {
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    // First-of-month, UTC. A running counter avoids summing usage_records on every quota check.
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    tokensUsed: integer('tokens_used').notNull().default(0),
    requestsUsed: integer('requests_used').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.periodStart] })],
);

export const rateLimitCounters = pgTable(
  'rate_limit_counters',
  {
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    requestCount: integer('request_count').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.windowStart] })],
);

// Authorizes /management/v1/** traffic. Deliberately not scoped to an applicationId: a
// management key administers the gateway itself, not any single application.
export const managementApiKeys = pgTable(
  'management_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    keyHash: text('key_hash').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('management_api_keys_key_hash_idx').on(table.keyHash)],
);

// Append-only observability history for every /v1/** request, success or failure. Written
// best-effort (fire-and-forget), separate from usageRecords/applicationUsageCounters so this
// table's breadth never risks the quota counter's transactional guarantee.
export const requestLogs = pgTable(
  'request_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id),
    requestId: text('request_id').notNull(),
    model: text('model').notNull(),
    // Nullable: a request can fail before a provider is ever chosen (e.g. model_not_found).
    provider: text('provider'),
    status: requestStatusEnum('status').notNull(),
    httpStatus: integer('http_status').notNull(),
    errorCode: text('error_code'),
    attempts: integer('attempts').notNull(),
    latencyMs: integer('latency_ms').notNull(),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    estimatedCostUsd: numeric('estimated_cost_usd', { precision: 12, scale: 6 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('request_logs_application_id_created_at_idx').on(table.applicationId, table.createdAt),
    index('request_logs_created_at_idx').on(table.createdAt),
  ],
);
