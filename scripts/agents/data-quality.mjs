import { getMode, readText, writeAgentReport, exitForStatus, getRuntimeD1Config, queryRuntimeD1Rows } from './lib.mjs';

const mode = getMode();

const schemaSource = readText('src/db/schema.ts');
const ratingsRouteSource = readText('src/routes/api/ratings.ts');
const tipsRouteSource = readText('src/routes/api/tips.ts');
const newsletterRouteSource = readText('src/routes/api/newsletter.ts');
const feedbackServiceSource = readText('src/domain/feedback/service.ts');

const runtimeD1 = getRuntimeD1Config();

function toInt(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.trunc(num);
}

async function queryRuntimeMetrics() {
  if (!runtimeD1.enabled) {
    return {
      enabled: false,
      connected: false,
      metrics: null,
      error: null,
    };
  }

  try {
    const publishedSpots = queryRuntimeD1Rows('SELECT COUNT(*) AS total FROM spots WHERE published = 1;', runtimeD1);
    const duplicateSlugs = queryRuntimeD1Rows(`
      SELECT COALESCE(SUM(cnt - 1), 0) AS duplicates
      FROM (
        SELECT COUNT(*) AS cnt
        FROM spots
        GROUP BY slug
        HAVING COUNT(*) > 1
      ) dup;
    `, runtimeD1);
    const ratingsTotal = queryRuntimeD1Rows('SELECT COUNT(*) AS total FROM ratings;', runtimeD1);
    const tipsTotal = queryRuntimeD1Rows('SELECT COUNT(*) AS total FROM spot_tips;', runtimeD1);
    const newsletterTotal = queryRuntimeD1Rows('SELECT COUNT(*) AS total FROM newsletter_subscribers;', runtimeD1);
    const newsletterDuplicates = queryRuntimeD1Rows(`
      SELECT COALESCE(SUM(cnt - 1), 0) AS duplicates
      FROM (
        SELECT COUNT(*) AS cnt
        FROM newsletter_subscribers
        GROUP BY email
        HAVING COUNT(*) > 1
      ) dup;
    `, runtimeD1);

    const resultSets = [publishedSpots, duplicateSlugs, ratingsTotal, tipsTotal, newsletterTotal, newsletterDuplicates];
    const failed = resultSets.find((result) => !result.connected);
    if (failed) {
      return {
        enabled: true,
        connected: false,
        metrics: null,
        error: failed.error,
      };
    }

    return {
      enabled: true,
      connected: true,
      metrics: {
        publishedSpots: toInt(publishedSpots.rows[0]?.total),
        duplicateSlugs: toInt(duplicateSlugs.rows[0]?.duplicates),
        ratingsTotal: toInt(ratingsTotal.rows[0]?.total),
        tipsTotal: toInt(tipsTotal.rows[0]?.total),
        newsletterTotal: toInt(newsletterTotal.rows[0]?.total),
        newsletterDuplicates: toInt(newsletterDuplicates.rows[0]?.duplicates),
      },
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
        notes: 'D1 runtime access not configured; runtime checks skipped (static checks only).',
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

  return [
    {
      name: 'Runtime DB Connectivity',
      success: true,
      notes: 'Connected and queried FinderNYC content metrics successfully.',
    },
    {
      name: 'Published Spot Inventory Present',
      success: metrics.publishedSpots > 0,
      notes: `published_spots=${metrics.publishedSpots}`,
    },
    {
      name: 'Spot Slug Uniqueness Heuristic',
      success: metrics.duplicateSlugs === 0,
      notes: `duplicate_slugs=${metrics.duplicateSlugs}`,
    },
    {
      name: 'Newsletter Email Uniqueness Heuristic',
      success: metrics.newsletterDuplicates === 0,
      notes: `newsletter_duplicates=${metrics.newsletterDuplicates} total=${metrics.newsletterTotal}`,
    },
    {
      name: 'Feedback Tables Available',
      success: metrics.ratingsTotal >= 0 && metrics.tipsTotal >= 0,
      notes: `ratings=${metrics.ratingsTotal} tips=${metrics.tipsTotal}`,
    },
  ];
}

async function run() {
  const staticChecks = [
    {
      name: 'Spot Slug Uniqueness Constraint',
      success: schemaSource.includes("slug: text('slug').notNull().unique()"),
      notes: 'Ensures spot URLs remain stable and deduplicated.',
    },
    {
      name: 'Newsletter Email Uniqueness Constraint',
      success: schemaSource.includes("email: text('email').notNull().unique()"),
      notes: 'Ensures newsletter signups dedupe at the database layer.',
    },
    {
      name: 'Ratings Score Range Validated in Domain Layer',
      success: feedbackServiceSource.includes('score must be an integer between 1 and 5'),
      notes: 'Ratings are validated before persistence.',
    },
    {
      name: 'Tip Length Validated in Domain Layer',
      success: feedbackServiceSource.includes('text must be between 10 and 500 characters'),
      notes: 'Tips reject empty or oversized submissions before persistence.',
    },
    {
      name: 'Newsletter Email Validated in Domain Layer',
      success: feedbackServiceSource.includes('valid email is required'),
      notes: 'Newsletter signups reject malformed addresses before persistence.',
    },
    {
      name: 'Feedback APIs Surface Validation Errors',
      success:
        ratingsRouteSource.includes('parsed.error')
        && tipsRouteSource.includes('parsed.error')
        && newsletterRouteSource.includes('parsed.error'),
      notes: 'Route handlers return deterministic validation failures.',
    },
    {
      name: 'Created Timestamps on Core Tables',
      success:
        schemaSource.includes("created_at: integer('created_at', { mode: 'timestamp_ms' })")
        && schemaSource.match(/created_at: integer\('created_at', \{ mode: 'timestamp_ms' \}\)/g)?.length >= 4,
      notes: 'Spots, tips, ratings, and newsletter tables support freshness analysis.',
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

  const checks = [...staticChecks, ...runtimeChecks];

  const report = writeAgentReport({
    id: 'data-quality',
    title: 'Data Quality Agent Report',
    summary: 'Validates FinderNYC schema constraints, feedback validation, and optional live D1 inventory quality heuristics.',
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