import { DEFAULT_EXPORT_PATH, readJson } from './lib.mjs';
import { getRuntimeD1Config, queryRuntimeD1Rows } from '../agents/lib.mjs';

const exportPath = process.env.D1_EXPORT_PATH ?? DEFAULT_EXPORT_PATH;
const runtimeD1 = getRuntimeD1Config();
const tableNames = ['leads', 'waitlist_entries', 'analytics_events', 'saved_searches', 'alert_delivery_attempts'];

if (!runtimeD1.enabled) {
  console.error('D1 verification requires Cloudflare auth or D1_REMOTE_ACCESS=1.');
  process.exit(1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function toInt(value) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : 0;
}

const payload = readJson(exportPath);

const expectedCounts = Object.fromEntries(
  tableNames.map((name) => [name, Array.isArray(payload.tables?.[name]) ? payload.tables[name].length : 0]),
);

const actualCounts = {};

for (const tableName of tableNames) {
  const result = queryRuntimeD1Rows(`SELECT COUNT(*) AS row_count FROM \`${tableName}\`;`, runtimeD1);
  if (!result.connected) {
    fail(`Failed to query ${tableName} row count: ${result.error ?? 'unknown error'}`);
  }
  actualCounts[tableName] = toInt(result.rows[0]?.row_count);
}

const mismatches = tableNames
  .filter((tableName) => expectedCounts[tableName] !== actualCounts[tableName])
  .map((tableName) => ({
    table: tableName,
    expected: expectedCounts[tableName],
    actual: actualCounts[tableName],
  }));

if (mismatches.length > 0) {
  console.error(JSON.stringify({ mismatches }, null, 2));
  process.exit(1);
}

const analyticsJson = queryRuntimeD1Rows(`
  SELECT COUNT(*) AS invalid_json
  FROM analytics_events
  WHERE properties IS NOT NULL AND json_valid(properties) = 0;
`, runtimeD1);

const savedSearchJson = queryRuntimeD1Rows(`
  SELECT COUNT(*) AS invalid_json
  FROM saved_searches
  WHERE filters IS NOT NULL AND json_valid(filters) = 0;
`, runtimeD1);

for (const [label, result] of [['analytics_events.properties', analyticsJson], ['saved_searches.filters', savedSearchJson]]) {
  if (!result.connected) {
    fail(`Failed JSON validation query for ${label}: ${result.error ?? 'unknown error'}`);
  }
  if (toInt(result.rows[0]?.invalid_json) > 0) {
    fail(`Invalid JSON detected in ${label}`);
  }
}

for (const tableName of tableNames) {
  const timestampCheck = queryRuntimeD1Rows(`
    SELECT COUNT(*) AS invalid_created_at
    FROM \`${tableName}\`
    WHERE created_at IS NOT NULL
      AND (typeof(created_at) != 'integer' OR created_at < 946684800000 OR created_at > 4102444800000);
  `, runtimeD1);

  if (!timestampCheck.connected) {
    fail(`Failed created_at validation query for ${tableName}: ${timestampCheck.error ?? 'unknown error'}`);
  }

  if (toInt(timestampCheck.rows[0]?.invalid_created_at) > 0) {
    fail(`Unexpected created_at values detected in ${tableName}`);
  }
}

const samples = {};
for (const tableName of tableNames) {
  const sample = queryRuntimeD1Rows(`SELECT * FROM \`${tableName}\` ORDER BY id ASC LIMIT 1;`, runtimeD1);
  if (!sample.connected) {
    fail(`Failed to query sample row for ${tableName}: ${sample.error ?? 'unknown error'}`);
  }
  samples[tableName] = sample.rows[0] ?? null;
}

console.log(JSON.stringify({
  verified: true,
  preview: runtimeD1.preview,
  exportPath,
  counts: actualCounts,
  samples,
}, null, 2));
