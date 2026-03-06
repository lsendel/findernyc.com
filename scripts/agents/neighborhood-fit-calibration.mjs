import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { REPORT_DIR, getMode, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const runtimeDbUrl = process.env.DATABASE_URL;
const runtimeEnabled = Boolean(runtimeDbUrl);
const recommendationsPath = join(REPORT_DIR, 'neighborhood-fit-calibration-recommendations.json');

const DEFAULT_NEIGHBORHOOD_FIT_WEIGHTS = {
  vibe_match: 22,
  borough_preference: 16,
  crowd_alignment: 12,
  budget_alignment: 12,
  query_vibe_match: 18,
  walkability_bonus: 10,
  filter_alignment: 10,
};

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

function adjustWeight(current, delta) {
  return Math.max(0, Math.min(50, Number((current + delta).toFixed(2))));
}

async function queryRuntimeMetrics() {
  if (!runtimeEnabled) {
    return {
      enabled: false,
      connected: false,
      byBand: [],
      byVibe: [],
      byPersonalization: [],
      error: null,
    };
  }

  const sql = neon(runtimeDbUrl);
  try {
    const byBandRows = await sql`
      SELECT
        COALESCE(properties->>'neighborhood_fit_band', 'unknown') AS band,
        COUNT(*)::int AS clicks,
        AVG(
          CASE
            WHEN properties ? 'rank_position' THEN NULLIF(properties->>'rank_position', '')::numeric
            ELSE NULL
          END
        ) AS avg_rank_position,
        AVG(
          CASE
            WHEN properties ? 'neighborhood_fit_score' THEN NULLIF(properties->>'neighborhood_fit_score', '')::numeric
            ELSE NULL
          END
        ) AS avg_fit_score
      FROM analytics_events
      WHERE event_name = 'search_result_click'
        AND created_at >= NOW() - INTERVAL '14 days'
        AND properties ? 'neighborhood_fit_band'
      GROUP BY 1
      ORDER BY clicks DESC;
    `;

    const byVibeRows = await sql`
      SELECT
        COALESCE(properties->>'neighborhood_fit_dominant_vibe', 'unknown') AS dominant_vibe,
        COUNT(*)::int AS clicks,
        AVG(
          CASE
            WHEN properties ? 'neighborhood_fit_score' THEN NULLIF(properties->>'neighborhood_fit_score', '')::numeric
            ELSE NULL
          END
        ) AS avg_fit_score
      FROM analytics_events
      WHERE event_name = 'search_result_click'
        AND created_at >= NOW() - INTERVAL '14 days'
        AND properties ? 'neighborhood_fit_dominant_vibe'
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT 15;
    `;

    const byPersonalizationRows = await sql`
      SELECT
        COALESCE(properties->>'neighborhood_fit_personalized', 'unknown') AS personalized,
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
        AND properties ? 'neighborhood_fit_personalized'
      GROUP BY 1
      ORDER BY clicks DESC;
    `;

    return {
      enabled: true,
      connected: true,
      byBand: byBandRows.map((row) => ({
        band: String(row.band ?? 'unknown'),
        clicks: toInt(row.clicks),
        avg_rank_position: toFloat(row.avg_rank_position),
        avg_fit_score: toFloat(row.avg_fit_score),
      })),
      byVibe: byVibeRows.map((row) => ({
        dominant_vibe: String(row.dominant_vibe ?? 'unknown'),
        clicks: toInt(row.clicks),
        avg_fit_score: toFloat(row.avg_fit_score),
      })),
      byPersonalization: byPersonalizationRows.map((row) => ({
        personalized: String(row.personalized ?? 'unknown'),
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
      byBand: [],
      byVibe: [],
      byPersonalization: [],
      error: message,
    };
  }
}

function buildRecommendations(runtime) {
  const recommendedWeights = { ...DEFAULT_NEIGHBORHOOD_FIT_WEIGHTS };
  const actions = [];

  if (!runtime.enabled || !runtime.connected) {
    return {
      generatedAt: new Date().toISOString(),
      windowDays: 14,
      totalClicks: 0,
      bandPerformance: [],
      vibePerformance: [],
      personalizationSplit: [],
      recommendedWeights,
      recommendedEnvJson: JSON.stringify(recommendedWeights),
      actions: ['No runtime DB metrics available; recommendations were skipped.'],
      notes: ['Populate DATABASE_URL in weekly calibration to retrain neighborhood-fit weights from click outcomes.'],
    };
  }

  const totalClicks = runtime.byBand.reduce((sum, row) => sum + row.clicks, 0);
  const byBand = Object.fromEntries(runtime.byBand.map((row) => [row.band, row]));
  const strong = byBand.strong;
  const weak = byBand.weak;

  if (totalClicks < 20) {
    actions.push('Insufficient post-click signal volume (<20 clicks) for confident retraining; keep current weights.');
  } else {
    if (strong && strong.clicks >= 5 && strong.avg_rank_position > 3) {
      recommendedWeights.vibe_match = adjustWeight(recommendedWeights.vibe_match, 2);
      recommendedWeights.query_vibe_match = adjustWeight(recommendedWeights.query_vibe_match, 2);
      actions.push('Strong-fit results are clicked lower in rank; boost vibe and query-vibe weights.');
    }

    if (weak && weak.clicks >= 5 && weak.avg_rank_position <= 2.5) {
      recommendedWeights.walkability_bonus = adjustWeight(recommendedWeights.walkability_bonus, -2);
      recommendedWeights.filter_alignment = adjustWeight(recommendedWeights.filter_alignment, -2);
      actions.push('Weak-fit results are being clicked near the top; reduce walkability/filter bias.');
    }

    const personalizedClicks = runtime.byPersonalization.find((row) => row.personalized === 'true')?.clicks ?? 0;
    const nonPersonalizedClicks = runtime.byPersonalization.find((row) => row.personalized === 'false')?.clicks ?? 0;

    if (nonPersonalizedClicks >= 10 && nonPersonalizedClicks >= personalizedClicks * 2) {
      recommendedWeights.borough_preference = adjustWeight(recommendedWeights.borough_preference, 2);
      recommendedWeights.crowd_alignment = adjustWeight(recommendedWeights.crowd_alignment, 1);
      actions.push('Non-personalized clicks dominate; strengthen personalized borough/crowd alignment.');
    }
  }

  if (actions.length === 0) {
    actions.push('No neighborhood-fit weight adjustment required this cycle.');
  }

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 14,
    totalClicks,
    bandPerformance: runtime.byBand,
    vibePerformance: runtime.byVibe,
    personalizationSplit: runtime.byPersonalization,
    recommendedWeights,
    recommendedEnvJson: JSON.stringify(recommendedWeights),
    actions,
    notes: [
      'Apply recommendedEnvJson to NEIGHBORHOOD_FIT_WEIGHTS_JSON for the next weekly cycle.',
      'Re-evaluate after the next Monday calibration run.',
    ],
  };
}

async function run() {
  const searchRouteSource = readText('src/routes/api/search.ts');
  const neighborhoodFitSource = readText('src/search/neighborhood-fit.ts');
  const clientSource = readText('src/assets/js/main.ts');

  const runtime = await queryRuntimeMetrics();
  const recommendations = buildRecommendations(runtime);
  writeFileSync(recommendationsPath, `${JSON.stringify(recommendations, null, 2)}\n`, 'utf8');

  const checks = [
    {
      name: 'Search Route Supports Runtime Neighborhood Fit Weight Overrides',
      success:
        searchRouteSource.includes('NEIGHBORHOOD_FIT_WEIGHTS_JSON')
        && searchRouteSource.includes('computeNeighborhoodFit'),
      notes: 'Verifies no-redeploy tuning path exists for neighborhood-fit scoring.',
    },
    {
      name: 'Neighborhood Fit Engine Exposes Calibratable Weight Model',
      success:
        neighborhoodFitSource.includes('defaultWeights')
        && neighborhoodFitSource.includes('NeighborhoodFitWeights'),
      notes: 'Verifies scoring model can ingest tuned weights from environment.',
    },
    {
      name: 'Client Emits Post-Click Neighborhood Fit Feedback',
      success:
        clientSource.includes("event_name: 'search_result_click'")
        && clientSource.includes('neighborhood_fit_band')
        && clientSource.includes('neighborhood_fit_score'),
      notes: 'Verifies click events carry neighborhood-fit context for retraining.',
    },
    {
      name: 'Runtime Neighborhood Fit Calibration Metrics',
      success: runtime.enabled ? runtime.connected || mode === 'warn' : true,
      notes: !runtime.enabled
        ? 'DATABASE_URL not set; runtime neighborhood metrics skipped.'
        : runtime.connected
          ? `bandBuckets=${runtime.byBand.length} personalizationBuckets=${runtime.byPersonalization.length}`
          : `Runtime metrics unavailable: ${runtime.error ?? 'unknown error'}`,
    },
  ];

  const details = [
    `runtime enabled: ${runtime.enabled}`,
    `runtime connected: ${runtime.connected}`,
    `band metric buckets: ${runtime.byBand.length}`,
    `vibe metric buckets: ${runtime.byVibe.length}`,
    `recommendations artifact: ${recommendationsPath}`,
    `recommended weights env: ${recommendations.recommendedEnvJson}`,
  ];

  if (runtime.error) details.push(`runtime error: ${runtime.error}`);

  const report = writeAgentReport({
    id: 'neighborhood-fit-calibration',
    title: 'Neighborhood Fit Calibration Agent Report',
    summary: 'Builds weekly neighborhood-fit retraining recommendations from post-click analytics signals.',
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

  console.log('Report written: output/agent-reports/neighborhood-fit-calibration.md');
  console.log('Recommendations written: output/agent-reports/neighborhood-fit-calibration-recommendations.json');
  exitForStatus(report);
}

run();
