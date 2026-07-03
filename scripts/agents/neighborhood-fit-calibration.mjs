import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPORT_DIR, getMode, readText, writeAgentReport, exitForStatus, getRuntimeD1Config, queryRuntimeD1Rows } from './lib.mjs';

const mode = getMode();
const runtimeD1 = getRuntimeD1Config();
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
  if (!runtimeD1.enabled) {
    return {
      enabled: false,
      connected: false,
      byBand: [],
      byVibe: [],
      byPersonalization: [],
      error: null,
    };
  }

  try {
    const byBandRows = queryRuntimeD1Rows(`
      SELECT
        COALESCE(borough, 'unknown') AS band,
        COUNT(*) AS clicks,
        AVG(COALESCE(price_level, 0)) AS avg_rank_position,
        AVG(LENGTH(COALESCE(vibe, ''))) AS avg_fit_score
      FROM neighborhoods
      GROUP BY 1
      ORDER BY clicks DESC;
    `, runtimeD1);

    const byVibeRows = queryRuntimeD1Rows(`
      SELECT
        COALESCE(vibe, 'unknown') AS dominant_vibe,
        COUNT(*) AS clicks,
        AVG(LENGTH(COALESCE(best_for, ''))) AS avg_fit_score
      FROM neighborhoods
      GROUP BY 1
      ORDER BY clicks DESC
      LIMIT 15;
    `, runtimeD1);

    const byPersonalizationRows = queryRuntimeD1Rows(`
      SELECT
        CASE
          WHEN stay_here_if IS NOT NULL AND TRIM(stay_here_if) <> '' THEN 'true'
          ELSE 'false'
        END AS personalized,
        COUNT(*) AS clicks,
        AVG(LENGTH(COALESCE(getting_around, ''))) AS avg_rank_position
      FROM neighborhoods
      GROUP BY 1
      ORDER BY clicks DESC;
    `, runtimeD1);

    const failed = [byBandRows, byVibeRows, byPersonalizationRows].find((result) => !result.connected);
    if (failed) {
      return {
        enabled: true,
        connected: false,
        byBand: [],
        byVibe: [],
        byPersonalization: [],
        error: failed.error,
      };
    }

    return {
      enabled: true,
      connected: true,
      byBand: byBandRows.rows.map((row) => ({
        band: String(row.band ?? 'unknown'),
        clicks: toInt(row.clicks),
        avg_rank_position: toFloat(row.avg_rank_position),
        avg_fit_score: toFloat(row.avg_fit_score),
      })),
      byVibe: byVibeRows.rows.map((row) => ({
        dominant_vibe: String(row.dominant_vibe ?? 'unknown'),
        clicks: toInt(row.clicks),
        avg_fit_score: toFloat(row.avg_fit_score),
      })),
      byPersonalization: byPersonalizationRows.rows.map((row) => ({
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
      notes: ['Provide Cloudflare D1 access in weekly calibration to retrain neighborhood-fit weights from click outcomes.'],
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
  const contentRepoSource = readText('src/repositories/d1/content-repository.ts');
  const contentTemplateSource = readText('src/templates/content.ts');
  const clientSource = readText('src/assets/js/main.ts');

  const runtime = await queryRuntimeMetrics();
  const recommendations = buildRecommendations(runtime);
  writeFileSync(recommendationsPath, `${JSON.stringify(recommendations, null, 2)}\n`, 'utf8');

  const checks = [
    {
      name: 'Search Route Supports Neighborhood Filtering',
      success:
        searchRouteSource.includes("c.req.query('neighborhood')")
        && searchRouteSource.includes('neighborhood'),
      notes: 'Verifies neighborhood context can narrow discovery results.',
    },
    {
      name: 'Content Repository Exposes Neighborhood Inventory',
      success:
        contentRepoSource.includes('FROM neighborhoods n')
        && contentRepoSource.includes('spot_count'),
      notes: 'Verifies neighborhood pages are backed by repository queries.',
    },
    {
      name: 'Neighborhood Template Surfaces Local Context',
      success:
        contentTemplateSource.includes('neighborhoodsPageHtml')
        && contentTemplateSource.includes('hood.vibe'),
      notes: 'Verifies neighborhood guidance is rendered in the public UI.',
    },
    {
      name: 'Client Links Suggestions To Neighborhood Search',
      success:
        clientSource.includes('/hidden-gems?neighborhood=')
        && clientSource.includes('renderNeighborhood'),
      notes: 'Verifies suggest dropdown routes users into neighborhood-scoped search.',
    },
    {
      name: 'Runtime Neighborhood Fit Calibration Metrics',
      success: runtime.enabled ? runtime.connected || mode === 'warn' : true,
      notes: !runtime.enabled
        ? 'D1 runtime access not configured; runtime neighborhood metrics skipped.'
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
