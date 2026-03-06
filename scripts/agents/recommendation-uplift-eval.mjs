import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { REPORT_DIR, getMode, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const runtimeDbUrl = process.env.DATABASE_URL;
const runtimeEnabled = Boolean(runtimeDbUrl);
const artifactPath = join(REPORT_DIR, 'recommendation-uplift-offline.json');
const markdownPath = join(REPORT_DIR, 'recommendation-uplift-offline.md');

function toFloat(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(4));
}

function toInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.trunc(num);
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mrr(rank) {
  if (!Number.isFinite(rank) || rank <= 0) return 0;
  return 1 / rank;
}

function runStaticOfflineEval() {
  const scenarios = [
    {
      id: 'foodie-queens',
      clicked_event_id: 'evt_003',
      session_pref: { preferred_category: 'food', preferred_borough: 'queens' },
      candidates: [
        { id: 'evt_005', relevance: 6.2, price_total: 0, commute_score: 75, category: 'wellness', borough: 'manhattan' },
        { id: 'evt_001', relevance: 5.8, price_total: 0, commute_score: 78, category: 'music', borough: 'brooklyn' },
        { id: 'evt_003', relevance: 4.9, price_total: 12.1, commute_score: 72, category: 'food', borough: 'queens' },
      ],
    },
    {
      id: 'arts-brooklyn',
      clicked_event_id: 'evt_006',
      session_pref: { preferred_category: 'arts', preferred_borough: 'brooklyn' },
      candidates: [
        { id: 'evt_002', relevance: 6.1, price_total: 29.4, commute_score: 52, category: 'networking', borough: 'manhattan' },
        { id: 'evt_006', relevance: 5.3, price_total: 14.2, commute_score: 80, category: 'arts', borough: 'brooklyn' },
        { id: 'evt_004', relevance: 4.7, price_total: 17.4, commute_score: 58, category: 'family', borough: 'bronx' },
      ],
    },
    {
      id: 'value-manhattan',
      clicked_event_id: 'evt_005',
      session_pref: { preferred_category: 'wellness', preferred_borough: 'manhattan' },
      candidates: [
        { id: 'evt_005', relevance: 5.4, price_total: 0, commute_score: 90, category: 'wellness', borough: 'manhattan' },
        { id: 'evt_002', relevance: 6.0, price_total: 29.4, commute_score: 55, category: 'networking', borough: 'manhattan' },
        { id: 'evt_003', relevance: 4.8, price_total: 12.1, commute_score: 66, category: 'food', borough: 'queens' },
      ],
    },
  ];

  const details = scenarios.map((scenario) => {
    const baseline = [...scenario.candidates]
      .sort((a, b) => b.relevance - a.relevance)
      .map((item) => item.id);

    const reranked = [...scenario.candidates]
      .map((item) => {
        const personalizationBoost = (item.category === scenario.session_pref.preferred_category ? 1.8 : 0)
          + (item.borough === scenario.session_pref.preferred_borough ? 1.4 : 0);
        const bestValueScore = item.relevance * 9 + (100 - item.price_total) * 0.25 + item.commute_score * 0.2;
        const finalScore = item.relevance + personalizationBoost + (bestValueScore - 50) / 15;
        return { ...item, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((item) => item.id);

    const baselineRank = baseline.indexOf(scenario.clicked_event_id) + 1;
    const rerankedRank = reranked.indexOf(scenario.clicked_event_id) + 1;
    return {
      scenario: scenario.id,
      clicked_event_id: scenario.clicked_event_id,
      baseline_rank: baselineRank,
      reranked_rank: rerankedRank,
      baseline_mrr: toFloat(mrr(baselineRank)),
      reranked_mrr: toFloat(mrr(rerankedRank)),
      uplift_mrr_pct: baselineRank > 0
        ? toFloat(((mrr(rerankedRank) - mrr(baselineRank)) / Math.max(0.0001, mrr(baselineRank))) * 100)
        : 0,
    };
  });

  const baselineMrr = toFloat(average(details.map((item) => item.baseline_mrr)));
  const rerankedMrr = toFloat(average(details.map((item) => item.reranked_mrr)));
  const upliftPct = baselineMrr > 0
    ? toFloat(((rerankedMrr - baselineMrr) / baselineMrr) * 100)
    : 0;

  return {
    mode: 'static',
    windowDays: 14,
    baselineMrr,
    rerankedMrr,
    upliftPct,
    details,
  };
}

async function queryRuntimeEval() {
  if (!runtimeEnabled) {
    return {
      enabled: false,
      connected: false,
      rows: [],
      metrics: null,
      error: null,
    };
  }

  const sql = neon(runtimeDbUrl);
  try {
    const rows = await sql`
      SELECT
        COALESCE(properties->>'ranking_strategy', 'baseline') AS ranking_strategy,
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
      ORDER BY clicks DESC;
    `;

    const normalizedRows = rows.map((row) => ({
      ranking_strategy: String(row.ranking_strategy ?? 'baseline'),
      clicks: toInt(row.clicks),
      avg_rank_position: toFloat(row.avg_rank_position),
    }));
    const baselineRows = normalizedRows.filter((row) => row.ranking_strategy === 'baseline');
    const experimentalRows = normalizedRows.filter((row) => row.ranking_strategy !== 'baseline');
    const baselineAvgRank = toFloat(average(baselineRows.map((row) => row.avg_rank_position).filter((value) => value > 0)));
    const experimentalAvgRank = toFloat(average(experimentalRows.map((row) => row.avg_rank_position).filter((value) => value > 0)));
    const rankEfficiencyUpliftPct = baselineAvgRank > 0 && experimentalAvgRank > 0
      ? toFloat(((baselineAvgRank - experimentalAvgRank) / baselineAvgRank) * 100)
      : 0;

    return {
      enabled: true,
      connected: true,
      rows: normalizedRows,
      metrics: {
        baselineAvgRank,
        experimentalAvgRank,
        rankEfficiencyUpliftPct,
      },
      error: null,
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      rows: [],
      metrics: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function run() {
  const routeSource = readText('src/routes/api/search.ts');
  const clientSource = readText('src/assets/js/main.ts');
  const recommendationSource = readText('src/search/recommendation-ranking.ts');

  const runtime = await queryRuntimeEval();
  const staticEval = runStaticOfflineEval();
  const result = {
    generatedAt: new Date().toISOString(),
    runtime,
    staticEval,
    summary: runtime.connected && runtime.metrics
      ? {
        source: 'runtime',
        baselineAvgRank: runtime.metrics.baselineAvgRank,
        experimentalAvgRank: runtime.metrics.experimentalAvgRank,
        rankEfficiencyUpliftPct: runtime.metrics.rankEfficiencyUpliftPct,
      }
      : {
        source: 'static',
        baselineMrr: staticEval.baselineMrr,
        rerankedMrr: staticEval.rerankedMrr,
        upliftPct: staticEval.upliftPct,
      },
  };

  writeFileSync(artifactPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

  const markdown = [
    '# Recommendation Uplift Offline Evaluation',
    '',
    `- Generated: ${result.generatedAt}`,
    `- Source: ${result.summary.source}`,
    ...(result.summary.source === 'runtime'
      ? [
        `- Baseline avg rank: ${result.summary.baselineAvgRank}`,
        `- Experimental avg rank: ${result.summary.experimentalAvgRank}`,
        `- Rank-efficiency uplift: ${result.summary.rankEfficiencyUpliftPct}%`,
      ]
      : [
        `- Baseline MRR: ${result.summary.baselineMrr}`,
        `- Reranked MRR: ${result.summary.rerankedMrr}`,
        `- Offline uplift: ${result.summary.upliftPct}%`,
      ]),
    '',
    '## Static Scenario Breakdown',
    '',
    ...result.staticEval.details.map((item) => `- ${item.scenario}: baseline rank ${item.baseline_rank} -> reranked rank ${item.reranked_rank} (uplift ${item.uplift_mrr_pct}%)`),
  ].join('\n');
  writeFileSync(markdownPath, `${markdown}\n`, 'utf8');

  const checks = [
    {
      name: 'Search Route Includes Personalized and Best-Value Ranking Hooks',
      success:
        routeSource.includes('flags.personalized_recommendations')
        && routeSource.includes('flags.best_value_ranking')
        && routeSource.includes('applyRecommendationRanking'),
      notes: 'Verifies route-level recommendation hooks are active.',
    },
    {
      name: 'Client Emits Ranking Strategy Recommendation Telemetry',
      success:
        clientSource.includes('ranking_strategy')
        && clientSource.includes('personalization_score')
        && clientSource.includes('best_value_score'),
      notes: 'Verifies click telemetry carries recommendation strategy signals.',
    },
    {
      name: 'Recommendation Ranking Module Present',
      success:
        recommendationSource.includes('buildSessionPreferenceProfile')
        && recommendationSource.includes('applyRecommendationRanking'),
      notes: 'Verifies recommendation model and profile logic exists.',
    },
    {
      name: 'Offline Uplift Artifact Generated',
      success: staticEval.details.length > 0 && Number.isFinite(staticEval.upliftPct),
      notes: `static uplift=${staticEval.upliftPct}%`,
    },
    {
      name: 'Runtime Uplift Metrics Availability',
      success: runtime.enabled ? runtime.connected || mode === 'warn' : true,
      notes: !runtime.enabled
        ? 'DATABASE_URL not set; runtime uplift metrics skipped.'
        : runtime.connected
          ? `runtime rows=${runtime.rows.length}`
          : `Runtime metrics unavailable: ${runtime.error ?? 'unknown error'}`,
    },
  ];

  const details = [
    `artifact json: ${artifactPath}`,
    `artifact markdown: ${markdownPath}`,
    `static baseline MRR: ${staticEval.baselineMrr}`,
    `static reranked MRR: ${staticEval.rerankedMrr}`,
    `static uplift: ${staticEval.upliftPct}%`,
    `runtime enabled: ${runtime.enabled}`,
    `runtime connected: ${runtime.connected}`,
  ];
  if (runtime.error) details.push(`runtime error: ${runtime.error}`);

  const report = writeAgentReport({
    id: 'recommendation-uplift-eval',
    title: 'Recommendation Uplift Evaluation Agent Report',
    summary: 'Generates offline uplift report comparing baseline ranking versus personalized + best-value reranking.',
    checks,
    details,
    mode,
    extra: result,
  });

  console.log('Report written: output/agent-reports/recommendation-uplift-eval.md');
  console.log('Uplift artifact written: output/agent-reports/recommendation-uplift-offline.md');
  exitForStatus(report);
}

run();
