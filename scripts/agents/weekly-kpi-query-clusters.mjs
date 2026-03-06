import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { REPORT_DIR, getMode, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const runtimeDbUrl = process.env.DATABASE_URL;
const runtimeEnabled = Boolean(runtimeDbUrl);
const jsonPath = join(REPORT_DIR, 'weekly-kpi-query-clusters.json');
const mdPath = join(REPORT_DIR, 'weekly-kpi-query-clusters.md');

const CLUSTER_RULES = [
  { key: 'bookable_events', label: 'Bookable Event Intent', patterns: [/\bbook\b/, /\bbooking\b/, /\brsvp\b/, /\bticket\b/, /\breserve\b/] },
  { key: 'business_marketing', label: 'Marketing And Ranking', patterns: [/\bseo\b/, /\branking\b/, /\bconversion\b/, /\bctr\b/, /\banalytics\b/, /\bmarketing\b/] },
  { key: 'partnership_programs', label: 'Partnership Programs', patterns: [/\bpartner\b/, /\bpartnership\b/, /\bagency\b/, /\bprogram\b/] },
  { key: 'networking_growth', label: 'Networking And Growth', patterns: [/\bnetworking\b/, /\bmeetup\b/, /\bfounder\b/, /\bstartup\b/, /\bgrowth\b/] },
  { key: 'family_planning', label: 'Family Activities', patterns: [/\bfamily\b/, /\bkids?\b/, /\bchildren\b/, /\bparents?\b/] },
  { key: 'music_nightlife', label: 'Music And Nightlife', patterns: [/\bmusic\b/, /\bjazz\b/, /\bconcert\b/, /\blive\b/, /\bnightlife\b/, /\bdj\b/] },
  { key: 'food_experiences', label: 'Food And Dining', patterns: [/\bfood\b/, /\bdining\b/, /\bbrunch\b/, /\brestaurant\b/, /\bmarket\b/] },
  { key: 'budget_friendly', label: 'Budget-Friendly Events', patterns: [/\bfree\b/, /\bcheap\b/, /\bbudget\b/, /\blow[- ]?cost\b/] },
  { key: 'local_discovery', label: 'Hyper-Local Discovery', patterns: [/\bnear me\b/, /\bnearby\b/, /\blocal\b/, /\bthis weekend\b/, /\btonight\b/, /\bthings to do\b/] },
];

function normalizeQueryText(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 180);
}

function classifyCluster(queryText) {
  for (const rule of CLUSTER_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(queryText))) {
      return { key: rule.key, label: rule.label };
    }
  }
  return { key: 'general_exploration', label: 'General Exploration' };
}

function toNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 0;
  return num;
}

function round4(value) {
  return Number(value.toFixed(4));
}

function buildBucket() {
  return {
    totals: {
      searches: 0,
      clicks: 0,
      inquiries: 0,
      schedules: 0,
    },
    byCluster: new Map(),
    sessionClusters: new Map(),
  };
}

function getOrCreateCluster(bucket, cluster) {
  if (bucket.byCluster.has(cluster.key)) return bucket.byCluster.get(cluster.key);
  const created = {
    cluster_key: cluster.key,
    label: cluster.label,
    searches: 0,
    clicks: 0,
    inquiries: 0,
    schedules: 0,
  };
  bucket.byCluster.set(cluster.key, created);
  return created;
}

function attachRates(item) {
  const ctr = item.searches > 0 ? item.clicks / item.searches : 0;
  const inquiryRate = item.clicks > 0 ? item.inquiries / item.clicks : 0;
  const scheduleRate = item.inquiries > 0 ? item.schedules / item.inquiries : 0;
  return {
    ...item,
    click_through_rate: round4(ctr),
    inquiry_rate: round4(inquiryRate),
    schedule_rate: round4(scheduleRate),
  };
}

function scoreOpportunity(item) {
  const targetCtr = 0.18;
  const targetInquiryRate = 0.28;
  const targetScheduleRate = 0.4;
  const targetCoverage = (targetCtr * 0.45) + (targetInquiryRate * 0.35) + (targetScheduleRate * 0.2);
  const observedCoverage = (item.click_through_rate * 0.45) + (item.inquiry_rate * 0.35) + (item.schedule_rate * 0.2);
  const coverageGap = targetCoverage > 0 ? Math.max(targetCoverage - observedCoverage, 0) / targetCoverage : 0;
  const volumeFactor = Math.min(1 + (Math.log2(item.searches + 1) / 4), 2);
  return Number((coverageGap * 100 * volumeFactor).toFixed(1));
}

async function queryAnalyticsEvents() {
  if (!runtimeEnabled) {
    return {
      enabled: false,
      connected: false,
      rows: [],
      error: null,
    };
  }

  const sql = neon(runtimeDbUrl);
  try {
    const rows = await sql`
      SELECT
        event_name,
        COALESCE(session_id, '') AS session_id,
        COALESCE(properties->>'query_text', '') AS query_text,
        created_at
      FROM analytics_events
      WHERE event_name IN ('search_query', 'search_result_click', 'inquiry_submitted', 'schedule_confirmed')
        AND created_at >= NOW() - INTERVAL '14 days'
      ORDER BY created_at ASC
      LIMIT 10000;
    `;

    return {
      enabled: true,
      connected: true,
      rows: rows.map((row) => ({
        event_name: String(row.event_name ?? ''),
        session_id: String(row.session_id ?? '').trim(),
        query_text: String(row.query_text ?? ''),
        created_at: new Date(String(row.created_at ?? new Date().toISOString())),
      })),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      enabled: true,
      connected: false,
      rows: [],
      error: message,
    };
  }
}

function buildWeeklySnapshot(runtime) {
  const now = new Date();
  const boundary = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const current = buildBucket();
  const previous = buildBucket();

  for (const row of runtime.rows) {
    const bucket = row.created_at >= boundary ? current : previous;
    const sessionId = row.session_id;

    if (row.event_name === 'search_query') {
      const queryText = normalizeQueryText(row.query_text);
      const cluster = classifyCluster(queryText);
      const clusterStats = getOrCreateCluster(bucket, cluster);
      clusterStats.searches += 1;
      bucket.totals.searches += 1;
      if (sessionId) bucket.sessionClusters.set(sessionId, cluster.key);
      continue;
    }

    if (row.event_name === 'search_result_click') {
      const sessionClusterKey = sessionId ? bucket.sessionClusters.get(sessionId) : null;
      const fallback = classifyCluster(normalizeQueryText(row.query_text));
      const cluster = CLUSTER_RULES.find((entry) => entry.key === sessionClusterKey)
        ? { key: sessionClusterKey, label: CLUSTER_RULES.find((entry) => entry.key === sessionClusterKey).label }
        : fallback;
      const clusterStats = getOrCreateCluster(bucket, cluster);
      clusterStats.clicks += 1;
      bucket.totals.clicks += 1;
      continue;
    }

    if (row.event_name === 'inquiry_submitted') {
      const sessionClusterKey = sessionId ? bucket.sessionClusters.get(sessionId) : null;
      const cluster = sessionClusterKey
        ? { key: sessionClusterKey, label: (CLUSTER_RULES.find((entry) => entry.key === sessionClusterKey)?.label ?? 'General Exploration') }
        : { key: 'general_exploration', label: 'General Exploration' };
      const clusterStats = getOrCreateCluster(bucket, cluster);
      clusterStats.inquiries += 1;
      bucket.totals.inquiries += 1;
      continue;
    }

    if (row.event_name === 'schedule_confirmed') {
      const sessionClusterKey = sessionId ? bucket.sessionClusters.get(sessionId) : null;
      const cluster = sessionClusterKey
        ? { key: sessionClusterKey, label: (CLUSTER_RULES.find((entry) => entry.key === sessionClusterKey)?.label ?? 'General Exploration') }
        : { key: 'general_exploration', label: 'General Exploration' };
      const clusterStats = getOrCreateCluster(bucket, cluster);
      clusterStats.schedules += 1;
      bucket.totals.schedules += 1;
    }
  }

  const currentClusters = Array.from(current.byCluster.values())
    .map(attachRates)
    .map((item) => ({ ...item, opportunity_score: scoreOpportunity(item) }))
    .sort((a, b) => {
      if (b.opportunity_score !== a.opportunity_score) return b.opportunity_score - a.opportunity_score;
      return b.searches - a.searches;
    });

  const previousClusters = Array.from(previous.byCluster.values())
    .map(attachRates)
    .map((item) => ({ ...item, opportunity_score: scoreOpportunity(item) }));

  const prevMap = new Map(previousClusters.map((item) => [item.cluster_key, item]));
  const topDeltas = currentClusters.slice(0, 8).map((item) => {
    const prev = prevMap.get(item.cluster_key);
    return {
      cluster_key: item.cluster_key,
      label: item.label,
      searches_current: item.searches,
      searches_previous: prev?.searches ?? 0,
      searches_delta: item.searches - (prev?.searches ?? 0),
      ctr_current: item.click_through_rate,
      ctr_previous: prev?.click_through_rate ?? 0,
      ctr_delta: round4(item.click_through_rate - (prev?.click_through_rate ?? 0)),
      inquiry_current: item.inquiry_rate,
      inquiry_previous: prev?.inquiry_rate ?? 0,
      inquiry_delta: round4(item.inquiry_rate - (prev?.inquiry_rate ?? 0)),
      schedule_current: item.schedule_rate,
      schedule_previous: prev?.schedule_rate ?? 0,
      schedule_delta: round4(item.schedule_rate - (prev?.schedule_rate ?? 0)),
      opportunity_score: item.opportunity_score,
    };
  });

  const totalCurrentRates = {
    click_through_rate: current.totals.searches > 0 ? round4(current.totals.clicks / current.totals.searches) : 0,
    inquiry_rate: current.totals.clicks > 0 ? round4(current.totals.inquiries / current.totals.clicks) : 0,
    schedule_rate: current.totals.inquiries > 0 ? round4(current.totals.schedules / current.totals.inquiries) : 0,
  };
  const totalPreviousRates = {
    click_through_rate: previous.totals.searches > 0 ? round4(previous.totals.clicks / previous.totals.searches) : 0,
    inquiry_rate: previous.totals.clicks > 0 ? round4(previous.totals.inquiries / previous.totals.clicks) : 0,
    schedule_rate: previous.totals.inquiries > 0 ? round4(previous.totals.schedules / previous.totals.inquiries) : 0,
  };

  return {
    generatedAt: new Date().toISOString(),
    windowDays: 14,
    split: {
      current_start: boundary.toISOString(),
      previous_start: new Date(boundary.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString(),
      current_end: now.toISOString(),
    },
    totals: {
      current: { ...current.totals, ...totalCurrentRates },
      previous: { ...previous.totals, ...totalPreviousRates },
      deltas: {
        searches: current.totals.searches - previous.totals.searches,
        clicks: current.totals.clicks - previous.totals.clicks,
        inquiries: current.totals.inquiries - previous.totals.inquiries,
        schedules: current.totals.schedules - previous.totals.schedules,
        click_through_rate: round4(totalCurrentRates.click_through_rate - totalPreviousRates.click_through_rate),
        inquiry_rate: round4(totalCurrentRates.inquiry_rate - totalPreviousRates.inquiry_rate),
        schedule_rate: round4(totalCurrentRates.schedule_rate - totalPreviousRates.schedule_rate),
      },
    },
    cluster_deltas: topDeltas,
  };
}

function buildMarkdown(snapshot) {
  const lines = [
    '# Weekly KPI Query Cluster Snapshot',
    '',
    `- generatedAt: ${snapshot.generatedAt}`,
    `- window: ${snapshot.windowDays} days (current 7d vs previous 7d)`,
    '',
    '## Funnel Totals',
    '',
    `- current searches/clicks/inquiries/schedules: ${snapshot.totals.current.searches}/${snapshot.totals.current.clicks}/${snapshot.totals.current.inquiries}/${snapshot.totals.current.schedules}`,
    `- previous searches/clicks/inquiries/schedules: ${snapshot.totals.previous.searches}/${snapshot.totals.previous.clicks}/${snapshot.totals.previous.inquiries}/${snapshot.totals.previous.schedules}`,
    `- current CTR/inquiry/schedule: ${(snapshot.totals.current.click_through_rate * 100).toFixed(1)}% / ${(snapshot.totals.current.inquiry_rate * 100).toFixed(1)}% / ${(snapshot.totals.current.schedule_rate * 100).toFixed(1)}%`,
    `- delta CTR/inquiry/schedule: ${(snapshot.totals.deltas.click_through_rate * 100).toFixed(1)}pp / ${(snapshot.totals.deltas.inquiry_rate * 100).toFixed(1)}pp / ${(snapshot.totals.deltas.schedule_rate * 100).toFixed(1)}pp`,
    '',
    '## Query Cluster Deltas',
    '',
    '| Cluster | Searches Δ | CTR Δ (pp) | Inquiry Δ (pp) | Schedule Δ (pp) | Opportunity |',
    '| --- | --- | --- | --- | --- | --- |',
    ...snapshot.cluster_deltas.map((item) =>
      `| ${item.label} | ${item.searches_delta} | ${(item.ctr_delta * 100).toFixed(1)} | ${(item.inquiry_delta * 100).toFixed(1)} | ${(item.schedule_delta * 100).toFixed(1)} | ${item.opportunity_score.toFixed(1)} |`),
  ];
  return `${lines.join('\n')}\n`;
}

async function run() {
  const insightsSource = readText('src/insights/hub.ts');
  const landingSource = readText('src/templates/landing.ts');
  const runtime = await queryAnalyticsEvents();
  const snapshot = runtime.connected ? buildWeeklySnapshot(runtime) : null;

  if (snapshot) {
    writeFileSync(jsonPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    writeFileSync(mdPath, buildMarkdown(snapshot), 'utf8');
  }

  const checks = [
    {
      name: 'Insights Hub Emits Query Cluster Summaries',
      success: insightsSource.includes('query_clusters') && insightsSource.includes('recommendations'),
      notes: 'Verifies production insights include actionable cluster outputs.',
    },
    {
      name: 'Landing Surfaces Cluster Opportunity Section',
      success: landingSource.includes('Top Query Clusters') && landingSource.includes('marketing-snapshot'),
      notes: 'Verifies cluster insights are visible in the marketing snapshot UI.',
    },
    {
      name: 'Runtime KPI Snapshot Generation',
      success: runtime.enabled ? runtime.connected || mode === 'warn' : true,
      notes: !runtime.enabled
        ? 'DATABASE_URL not set; runtime KPI snapshot skipped.'
        : runtime.connected
          ? `Generated from ${runtime.rows.length} analytics rows.`
          : `Runtime query failed: ${runtime.error ?? 'unknown error'}`,
    },
  ];

  const details = snapshot
    ? [
      `current searches/clicks/inquiries/schedules: ${snapshot.totals.current.searches}/${snapshot.totals.current.clicks}/${snapshot.totals.current.inquiries}/${snapshot.totals.current.schedules}`,
      `delta ctr/inquiry/schedule (pp): ${(snapshot.totals.deltas.click_through_rate * 100).toFixed(1)} / ${(snapshot.totals.deltas.inquiry_rate * 100).toFixed(1)} / ${(snapshot.totals.deltas.schedule_rate * 100).toFixed(1)}`,
      `top cluster deltas: ${snapshot.cluster_deltas.slice(0, 3).map((item) => `${item.cluster_key}(${item.opportunity_score.toFixed(1)})`).join(', ') || 'none'}`,
    ]
    : ['No snapshot generated (runtime DB unavailable).'];

  const report = writeAgentReport({
    id: 'weekly-kpi-query-clusters',
    title: 'Weekly KPI Query Cluster Snapshot',
    summary: 'Builds weekly cluster-level KPI deltas for search -> inquiry -> schedule optimization loops.',
    checks,
    details,
    mode,
    extra: {
      runtime: {
        enabled: runtime.enabled,
        connected: runtime.connected,
        error: runtime.error,
      },
      artifacts: {
        json: jsonPath,
        markdown: mdPath,
      },
      snapshot,
    },
  });

  console.log('Report written: output/agent-reports/weekly-kpi-query-clusters.md');
  console.log('Snapshot JSON: output/agent-reports/weekly-kpi-query-clusters.json');
  console.log('Snapshot markdown: output/agent-reports/weekly-kpi-query-clusters.md');
  exitForStatus(report);
}

void run();

