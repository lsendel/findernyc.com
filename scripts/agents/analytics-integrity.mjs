import { getMode, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();

const mainSource = readText('src/assets/js/main.ts');
const landingSource = readText('src/templates/landing.ts');
const searchRouteSource = readText('src/routes/api/search.ts');
const ratingsRouteSource = readText('src/routes/api/ratings.ts');
const tipsRouteSource = readText('src/routes/api/tips.ts');
const newsletterRouteSource = readText('src/routes/api/newsletter.ts');

const clientApiCalls = [
  { label: 'search suggest', pattern: "/api/search/suggest?q=" },
  { label: 'ratings', pattern: "'/api/ratings'" },
  { label: 'tips', pattern: "'/api/tips'" },
  { label: 'newsletter', pattern: "'/api/newsletter'" },
];

const checks = [
  {
    name: 'Legacy Analytics Pipeline Removed From Client',
    success:
      !mainSource.includes("event_name:")
      && !mainSource.includes('/api/analytics/events')
      && !mainSource.includes('initAnalytics'),
    notes: 'FinderNYC no longer ships a client-side analytics event bus.',
  },
  {
    name: 'Client Search Suggest Uses API Route',
    success: mainSource.includes("fetch(`/api/search/suggest?q="),
    notes: 'Hero and search inputs call the suggest endpoint.',
  },
  {
    name: 'Client Feedback Forms Use API Routes',
    success: clientApiCalls.every((entry) => mainSource.includes(entry.pattern)),
    notes: clientApiCalls.map((entry) => `${entry.label}:${mainSource.includes(entry.pattern) ? 'ok' : 'missing'}`).join(' | '),
  },
  {
    name: 'Landing Page Exposes Search Entry Points',
    success:
      landingSource.includes('hero-search-input')
      && landingSource.includes('hero-suggest-dropdown'),
    notes: 'Checks hero search wiring expected by main.ts.',
  },
  {
    name: 'Search API Returns Structured JSON',
    success:
      searchRouteSource.includes('spots: []')
      && searchRouteSource.includes('guides: []')
      && searchRouteSource.includes('total: 0'),
    notes: 'Verifies stable empty-state response shape.',
  },
  {
    name: 'Feedback APIs Return Deterministic Error Codes',
    success:
      ratingsRouteSource.includes("'invalid_json'")
      && tipsRouteSource.includes("'invalid_json'")
      && newsletterRouteSource.includes("'invalid_json'")
      && ratingsRouteSource.includes("'database_unavailable'")
      && tipsRouteSource.includes("'database_unavailable'")
      && newsletterRouteSource.includes("'database_unavailable'"),
    notes: 'Checks shared validation and availability error vocabulary.',
  },
  {
    name: 'Client Session Helper Present For Ratings',
    success: mainSource.includes("'fnc_sid'") && mainSource.includes('crypto.randomUUID()'),
    notes: 'Ratings attach a lightweight anonymous session id.',
  },
];

const details = [
  'Analytics integrity now validates client-to-API wiring instead of a removed event taxonomy.',
  `client API calls checked: ${clientApiCalls.length}`,
];

const report = writeAgentReport({
  id: 'analytics-integrity',
  title: 'Analytics Integrity Agent Report',
  summary: 'Validates the post-pivot client interaction surface: search suggest, ratings, tips, newsletter, and removal of the legacy analytics pipeline.',
  checks,
  details,
  mode,
  extra: {
    clientApiCalls: clientApiCalls.map((entry) => ({
      ...entry,
      present: mainSource.includes(entry.pattern),
    })),
  },
});

console.log('Report written: output/agent-reports/analytics-integrity.md');
exitForStatus(report);