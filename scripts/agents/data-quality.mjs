import { neon } from '@neondatabase/serverless';
import { getMode, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();

const schemaSource = readText('src/db/schema.ts');
const leadsRouteSource = readText('src/routes/api/leads.ts');
const waitlistRouteSource = readText('src/routes/api/waitlist.ts');

const runtimeDbUrl = process.env.DATABASE_URL;
const runtimeEnabled = Boolean(runtimeDbUrl);

function toInt(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.trunc(num);
}

async function queryRuntimeMetrics() {
  if (!runtimeEnabled) {
    return {
      enabled: false,
      connected: false,
      metrics: null,
      error: null,
    };
  }

  const sql = neon(runtimeDbUrl);

  try {
    const waitlistTotalRows = await sql`SELECT COUNT(*)::int AS total FROM waitlist_entries;`;
    const waitlistDuplicateRows = await sql`
      SELECT COALESCE(SUM(cnt - 1), 0)::int AS duplicates
      FROM (
        SELECT COUNT(*)::int AS cnt
        FROM waitlist_entries
        GROUP BY email
        HAVING COUNT(*) > 1
      ) dup;
    `;
    const invalidZipRows = await sql`
      SELECT COUNT(*)::int AS invalid_zip
      FROM waitlist_entries
      WHERE zip_code IS NOT NULL
        AND zip_code <> ''
        AND zip_code !~ '^[0-9]{5}(-[0-9]{4})?$';
    `;

    const analyticsTotalRows = await sql`SELECT COUNT(*)::int AS total FROM analytics_events;`;
    const analyticsRecentRows = await sql`
      SELECT COUNT(*)::int AS recent_24h
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '24 hours';
    `;

    const leadsTotalRows = await sql`SELECT COUNT(*)::int AS total FROM leads;`;
    const leadsRecentRows = await sql`
      SELECT COUNT(*)::int AS recent_24h
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '24 hours';
    `;

    const metrics = {
      waitlistTotal: toInt(waitlistTotalRows[0]?.total),
      waitlistDuplicates: toInt(waitlistDuplicateRows[0]?.duplicates),
      waitlistInvalidZip: toInt(invalidZipRows[0]?.invalid_zip),
      analyticsTotal: toInt(analyticsTotalRows[0]?.total),
      analyticsRecent24h: toInt(analyticsRecentRows[0]?.recent_24h),
      leadsTotal: toInt(leadsTotalRows[0]?.total),
      leadsRecent24h: toInt(leadsRecentRows[0]?.recent_24h),
    };

    return {
      enabled: true,
      connected: true,
      metrics,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      enabled: true,
      connected: false,
      metrics: null,
      error: message,
    };
  }
}

function computeRuntimeChecks(runtime) {
  if (!runtime.enabled) {
    return [
      {
        name: 'Runtime DB Quality Checks',
        success: true,
        notes: 'DATABASE_URL not set; runtime checks skipped (static checks only).',
      },
    ];
  }

  if (!runtime.connected || !runtime.metrics) {
    return [
      {
        name: 'Runtime DB Connectivity',
        success: mode === 'warn',
        notes: `Unable to query runtime metrics: ${runtime.error ?? 'unknown error'}`,
      },
    ];
  }

  const metrics = runtime.metrics;
  const duplicateRatio = metrics.waitlistTotal > 0 ? metrics.waitlistDuplicates / metrics.waitlistTotal : 0;

  const checks = [
    {
      name: 'Runtime DB Connectivity',
      success: true,
      notes: 'Connected and queried metrics successfully.',
    },
    {
      name: 'Waitlist Duplicate Ratio Heuristic',
      success: metrics.waitlistTotal < 100 || duplicateRatio <= 0.15,
      notes: `duplicates=${metrics.waitlistDuplicates}/${metrics.waitlistTotal} ratio=${duplicateRatio.toFixed(3)} threshold=0.150`,
    },
    {
      name: 'Waitlist ZIP Quality Heuristic',
      success: metrics.waitlistInvalidZip === 0,
      notes: `invalid_zip=${metrics.waitlistInvalidZip}`,
    },
    {
      name: 'Analytics Ingestion Activity Heuristic',
      success: metrics.analyticsTotal < 200 || metrics.analyticsRecent24h > 0,
      notes: `analytics_recent_24h=${metrics.analyticsRecent24h} analytics_total=${metrics.analyticsTotal}`,
    },
    {
      name: 'Lead Ingestion Activity Heuristic',
      success: metrics.leadsTotal < 50 || metrics.leadsRecent24h > 0,
      notes: `leads_recent_24h=${metrics.leadsRecent24h} leads_total=${metrics.leadsTotal}`,
    },
  ];

  return checks;
}

async function run() {
  const staticChecks = [
    {
      name: 'Lead Email Uniqueness Constraint',
      success: schemaSource.includes("email: varchar('email', { length: 255 }).notNull().unique()"),
      notes: 'Ensures dedupe guard at database layer for leads',
    },
    {
      name: 'Lead Duplicate Handling in API',
      success: leadsRouteSource.includes('email_exists') && (leadsRouteSource.includes("code === '23505'") || leadsRouteSource.includes("includes('unique')")),
      notes: 'Ensures duplicate lead writes return deterministic API status',
    },
    {
      name: 'Waitlist Email Required',
      success: schemaSource.includes("waitlist_entries") && schemaSource.includes("email: varchar('email', { length: 255 }).notNull()"),
      notes: 'Ensures waitlist minimum identity field is required',
    },
    {
      name: 'Waitlist API Validates Email Shape',
      success: waitlistRouteSource.includes('z.string().email()'),
      notes: 'Ensures invalid emails are rejected before write',
    },
    {
      name: 'Created Timestamps on Data Tables',
      success:
        schemaSource.includes("created_at: timestamp('created_at').defaultNow()")
        && schemaSource.match(/created_at: timestamp\('created_at'\)\.defaultNow\(\)/g)?.length >= 3,
      notes: 'Ensures trend analysis is possible for all core tables',
    },
  ];

  const runtime = await queryRuntimeMetrics();
  const runtimeChecks = computeRuntimeChecks(runtime);

  const details = [
    `runtime checks enabled: ${runtime.enabled}`,
    `mode: ${mode}`,
  ];

  if (runtime.enabled && runtime.connected && runtime.metrics) {
    details.push(`runtime metrics: ${JSON.stringify(runtime.metrics)}`);
  }

  if (runtime.enabled && !runtime.connected) {
    details.push(`runtime query error: ${runtime.error}`);
  }

  details.push('Nightly runs should provide DATABASE_URL via secrets to enable live anomaly detection.');

  const checks = [...staticChecks, ...runtimeChecks];

  const report = writeAgentReport({
    id: 'data-quality',
    title: 'Data Quality Agent Report',
    summary: 'Validates schema-level controls and optional live DB quality heuristics for duplicates and ingestion anomalies.',
    checks,
    details,
    mode,
    extra: {
      runtimeEnabled: runtime.enabled,
      runtimeConnected: runtime.connected,
      runtimeMetrics: runtime.metrics,
      runtimeError: runtime.error,
    },
  });

  console.log('Report written: output/agent-reports/data-quality.md');
  exitForStatus(report);
}

run();
