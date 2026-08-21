import { drizzle } from 'drizzle-orm/bun-sql';
import { env } from '../utils/env.ts';

function toConnectionString(): string {
  const { host, port, user, password, database, ssl } = env.db;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}${sslParam}`;
}

export const db = drizzle(toConnectionString());
