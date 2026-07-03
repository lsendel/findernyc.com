import { DEFAULT_EXPORT_PATH, DEFAULT_IMPORT_SQL_PATH, buildImportSql, readJson, writeText } from './lib.mjs';

const exportPath = process.env.D1_EXPORT_PATH ?? DEFAULT_EXPORT_PATH;
const sqlPath = process.env.D1_IMPORT_SQL_PATH ?? DEFAULT_IMPORT_SQL_PATH;

try {
  const payload = readJson(exportPath);
  const sql = buildImportSql(payload);
  writeText(sqlPath, sql);
  console.log(`D1 import SQL written: ${sqlPath}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
