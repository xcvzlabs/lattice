import {
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // Nullable overrides: null means unlimited. Set directly via drizzle-kit studio until a
  // management API exists.
  monthlyTokenQuota: integer('monthly_token_quota'),
  rateLimitPerMinute: integer('rate_limit_per_minute'),
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
