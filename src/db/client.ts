import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type DatabaseBinding = Parameters<typeof drizzle>[0];

export function createDb(database: DatabaseBinding) {
  return drizzle(database, { schema });
}
