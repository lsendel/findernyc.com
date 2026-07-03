import type { AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import type { ReturnTypeOfCreateDb } from './write.types';

export async function insertOneAndGetId<TTable extends AnySQLiteTable>(
  db: ReturnTypeOfCreateDb,
  table: TTable,
  values: TTable['$inferInsert'],
): Promise<number> {
  const result = await db.insert(table).values(values).run();
  const id = result.meta?.last_row_id;
  if (typeof id === 'number' && Number.isInteger(id) && id > 0) {
    return id;
  }

  throw new Error('insert_missing_last_row_id');
}
