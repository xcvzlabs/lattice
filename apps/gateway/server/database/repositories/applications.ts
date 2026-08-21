import { desc, eq } from 'drizzle-orm';
import { createLatticeError } from '../../utils/errors.ts';
import { db } from '../client.ts';
import { applications } from '../schema.ts';

export type Application = typeof applications.$inferSelect;

export type UpdateApplicationInput = {
  name?: string;
  monthlyTokenQuota?: number | null;
  rateLimitPerMinute?: number | null;
  allowedModels?: string[] | null;
  routingStrategy?: Application['routingStrategy'];
};

export async function createApplication(name: string): Promise<Application> {
  const [application] = await db.insert(applications).values({ name }).returning();
  if (application === undefined) {
    throw createLatticeError(500, 'internal_error', 'Insert into applications returned no row');
  }
  return application;
}

export async function listApplications(): Promise<Application[]> {
  return db.select().from(applications).orderBy(desc(applications.createdAt));
}

export async function getApplicationById(id: string): Promise<Application | undefined> {
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  return application;
}

export async function updateApplication(
  id: string,
  input: UpdateApplicationInput,
): Promise<Application | undefined> {
  const [application] = await db
    .update(applications)
    .set(input)
    .where(eq(applications.id, id))
    .returning();
  return application;
}

/** Sets `disabledAt`, checked alongside `revokedAt` in verify-api-key.ts so every one of this
 * application's keys stops working immediately without revoking them individually. */
export async function disableApplication(id: string): Promise<Application | undefined> {
  const [application] = await db
    .update(applications)
    .set({ disabledAt: new Date() })
    .where(eq(applications.id, id))
    .returning();
  return application;
}

export async function enableApplication(id: string): Promise<Application | undefined> {
  const [application] = await db
    .update(applications)
    .set({ disabledAt: null })
    .where(eq(applications.id, id))
    .returning();
  return application;
}
