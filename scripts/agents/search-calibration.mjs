import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { REPORT_DIR, getMode, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const runtimeDbUrl = process.env.DATABASE_URL;
const runtimeEnabled = Boolean(runtimeDbUrl);
const recommendationsPath = join(REPORT_DIR, 'search-calibration-recommendations.json');

function toInt(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Math.trunc(num);
}

function toFloat(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return Number(num.toFixed(4));
}

async function queryRuntimeMetrics() {
  if (!runtimeEnabled) {
    return {
      enabled: false,
      connected: false,
      queries: [],
      clicksByQuery: [],
      clicksByEvent: [],
      error: null,
    };
  }

  const sql = neon(runtimeDbUrl);
  try {
    const queryRows = await sql`
      SELECT
        COALESCE(properties->>'query_text', '') AS query_text,
        COUNT(*)::int AS searches,
        AVG(
          CASE
            WHEN properties ? 'result_count' THEN NULLIF(properties->>'result_count', '')::numeric
            ELSE NULL
          END
        ) AS avg_result_count
      FROM analytics_events
      WHERE event_name = 'search_query'
        AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY 1
      ORDER BY searches DESC
      LIMIT 30;
    `;

    const clickQueryRows = await sql`
      SELECT
        COALESCE(properties->>'query_text', '') AS query_text,
        COUNT(*)::int AS clicks
      FROM analytics_events
      WHERE event_name = 'search_result_click'
        AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT 30;
    `;

    const clickEventRows = await sql`
      SELECT
        COALESCE(properties->>'event_id', '') AS event_id,
        COUNT(*)::int AS clicks,
        AVG(
          CASE
            WHEN properties ? 'rank_position' THEN NULLIF(properties->>'rank_position', '')::numeric
            ELSE NULL
          END
        ) AS avg_rank_position
      FROM analytics_events
      WHERE event_name = 'search_result_click'
        AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT 30;
    `;

    return {
      enabled: true,
      connected: true,
      queries: queryRows.map((row) => ({
        query_text: String(row.query_text ?? ''),
        searches: toInt(row.searches),
        avg_result_count: toFloat(row.avg_result_count),
      })),
      clicksByQuery: clickQueryRows.map((row) => ({
        query_text: String(row.query_text ?? ''),
        clicks: toInt(row.clicks),
      })),
      clicksByEvent: clickEventRows.map((row) => ({
        event_id: String(row.event_id ?? ''),
        clicks: toInt(row.clicks),
        avg_rank_position: toFloat(row.avg_rank_position),
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      enabled: true,
      connected: false,
      queries: [],
      clicksByQuery: [],
      clicksByEvent: [],
      error: message,
    };
  }
}

function buildRecommendations(runtime) {
  if (!runtime.enabled || !runtime.connected) {
    return {
      generatedAt: new Date().toISOString(),
      windowDays: 14,
      queryRecommendations: [],
      eventBoostCandidates: [],
      notes: ['No runtime DB metrics available; recommendations were skipped.'],
    };
  }

  const clicksByQueryMap = new Map(runtime.clicksByQuery.map((row) => [row.query_text, row.clicks]));

  const queryRecommendations = runtime.queries
    .filter((row) => row.query_text && row.searches > 0)
    .map((row) => {
      const clicks = clicksByQueryMap.get(row.query_text) ?? 0;
      const ctr = toFloat(clicks / row.searches);
      const actions = [];

      if (row.searches >= 5 && ctr < 0.15) {
        actions.push('Increase exact phrase and title-term weights for this query cluster.');
      }
      if (row.avg_result_count < 2) {
        actions.push('Improve recall by widening candidate set or lowering strict filter boosts.');
      }
      if (actions.length === 0) {
        actions.push('No weight adjustment required this cycle.');
      }

      return {
        query_text: row.query_text,
        searches: row.searches,
        clicks,
        ctr,
        avg_result_count: row.avg_result_count,
        actions,
      };
    })
    .slice(0, 15);

  const eventBoostCandidates = runtime.clicksByEvent
    .filter((row) => row.event_id && row.clicks >= 3 && row.avg_rank_position > 2)
    .map((row) => ({
      event_id: row.event_id,
      clicks: row.clicks,
      avg_rank_position: row.avg_rank_position,
      suggested_boost: toFloat(Math.min(2, row.clicks / 10)),
      rationale: 'Frequently clicked despite lower rank position; candidate for behavioral boost.',
    }))
    .slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 14,
    queryRecommendations,
    eventBoostCandidates,
    notes: [
      'Use suggestions to update SEARCH_RANKING_WEIGHTS_JSON and SEARCH_BEHAVIORAL_BOOSTS_JSON.',
      'Re-evaluate after the next weekly calibration run.',
    ],
  };
}

async function run() {
  const searchRouteSource = readText('src/routes/api/search.ts');
  const searchEngineSource = readText('src/search/unified-search.ts');
  const clientSource = readText('src/assets/js/main.ts');

  const runtime = await queryRuntimeMetrics();
  const recommendations = buildRecommendations(runtime);
  writeFileSync(recommendationsPath, `${JSON.stringify(recommendations, null, 2)}\n`, 'utf8');

  const checks = [
    {
      name: 'Search Route Enforces Feature Flag Gate',
      success: searchRouteSource.includes('flags.unified_smart_search'),
      notes: 'Verifies smart search remains rollout-safe.',
    },
    {
      name: 'Search Route Supports Runtime Ranking Calibration Inputs',
      success:
        searchRouteSource.includes('SEARCH_RANKING_WEIGHTS_JSON')
        && searchRouteSource.includes('SEARCH_BEHAVIORAL_BOOSTS_JSON'),
      notes: 'Verifies no-redeploy tuning path is available.',
    },
    {
      name: 'Search Engine Supports Ranking Weights and Behavioral Boosts',
      success:
        searchEngineSource.includes('defaultSearchRankingWeights')
        && searchEngineSource.includes('behavioral_boosts'),
      notes: 'Verifies scoring model is calibration-aware.',
    },
    {
      name: 'Client Emits Search Query and Result Click Analytics',
      success:
        clientSource.includes("event_name: 'search_query'")
        && clientSource.includes("event_name: 'search_result_click'"),
      notes: 'Verifies behavioral signals are emitted for weekly tuning.',
    },
    {
      name: 'Runtime Search Calibration Metrics',
      success: runtime.enabled ? runtime.connected || mode === 'warn' : true,
      notes: !runtime.enabled
        ? 'DATABASE_URL not set; runtime calibration metrics skipped.'
        : runtime.connected
          ? `queries=${runtime.queries.length} clickEvents=${runtime.clicksByEvent.length}`
          : `Runtime metrics unavailable: ${runtime.error ?? 'unknown error'}`,
    },
  ];

  const details = [
    `runtime enabled: ${runtime.enabled}`,
    `runtime connected: ${runtime.connected}`,
    `query recommendations: ${recommendations.queryRecommendations.length}`,
    `event boost candidates: ${recommendations.eventBoostCandidates.length}`,
    `recommendations artifact: ${recommendationsPath}`,
  ];

  if (runtime.error) details.push(`runtime error: ${runtime.error}`);

  const report = writeAgentReport({
    id: 'search-calibration',
    title: 'Search Calibration Agent Report',
    summary: 'Builds weekly search ranking calibration recommendations from analytics outcome signals and verifies tuning controls.',
    checks,
    details,
    mode,
    extra: {
      runtimeEnabled: runtime.enabled,
      runtimeConnected: runtime.connected,
      runtimeError: runtime.error,
      recommendationsPath,
      recommendations,
    },
  });

  console.log('Report written: output/agent-reports/search-calibration.md');
  console.log('Recommendations written: output/agent-reports/search-calibration-recommendations.json');
  exitForStatus(report);
}

run();
