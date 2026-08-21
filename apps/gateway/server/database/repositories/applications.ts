import { db } from '../client.ts';
import { applications } from '../schema.ts';

export type Application = typeof applications.$inferSelect;

export async function createApplication(name: string): Promise<Application> {
  const [application] = await db.insert(applications).values({ name }).returning();
  if (application === undefined) {
    throw new Error('Insert into applications returned no row');
  }
  return application;
}
