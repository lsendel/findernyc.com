import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getMode, runCommand, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();
const ENV_PATH = resolve(process.cwd(), '.env');

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(ENV_PATH);

const baseUrl = (process.env.PRODUCTION_BASE_URL ?? 'https://findernyc.com').replace(/\/+$/, '');
const skipLocal = process.env.PRODUCTION_REGRESSION_SKIP_LOCAL === '1';
const testEmail = process.env.QA_TEST_EMAIL ?? `prod-regression+${Date.now()}@example.com`;
const testSessionId = process.env.QA_TEST_SESSION_ID ?? `prod-regression-${Date.now()}`;

function buildCheck(name, success, notes, extra = {}) {
  return { name, success, notes, ...extra };
}

function includes(text, marker) {
  return typeof text === 'string' && text.includes(marker);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'findernyc-production-regression/2.0',
      Accept: '*/*',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const bodyText = await response.text();
  let json;

  if (contentType.includes('application/json') || bodyText.trim().startsWith('{')) {
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = undefined;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    contentType,
    text: bodyText,
    json,
  };
}

function extractSpotId(html) {
  const match = html.match(/data-spot-id="(\d+)"/);
  return match ? Number(match[1]) : null;
}

async function run() {
  const checks = [];
  const details = [
    `base URL: ${baseUrl}`,
    `env file loaded: ${existsSync(ENV_PATH)}`,
    `mode: ${mode}`,
    `QA email: ${testEmail}`,
    `QA session id: ${testSessionId}`,
  ];

  if (!skipLocal) {
    for (const { name, command } of [
      { name: 'Local typecheck', command: 'npm run typecheck' },
      { name: 'Local unit tests', command: 'npm test' },
    ]) {
      const result = runCommand(command);
      checks.push(buildCheck(
        name,
        result.success,
        `${command} (exit ${result.code}, ${result.durationMs}ms)`,
        result.success ? {} : { stderr: result.stderr || result.stdout },
      ));
    }
  } else {
    checks.push(buildCheck(
      'Local verification skipped',
      true,
      'PRODUCTION_REGRESSION_SKIP_LOCAL=1',
    ));
  }

  const pageChecks = [
    { path: '/', marker: 'Skip the tourist traps', label: 'Landing page' },
    { path: '/hidden-gems?q=coffee', marker: 'Search: coffee', label: 'Search results page' },
    { path: '/neighborhoods', marker: 'Neighborhoods', label: 'Neighborhoods index' },
    { path: '/itineraries', marker: 'Itineraries', label: 'Guides index' },
    { path: '/about', marker: 'About FinderNYC', label: 'About page' },
    { path: '/tips', marker: 'Practical Tips', label: 'Tips page' },
    { path: '/robots.txt', marker: 'Sitemap: https://findernyc.com/sitemap.xml', label: 'robots.txt' },
    { path: '/llms.txt', marker: '# FinderNYC', label: 'llms.txt' },
  ];

  for (const page of pageChecks) {
    const response = await request(page.path, {
      headers: page.path.endsWith('.txt') ? {} : { Accept: 'text/html' },
    });
    const success = response.status === 200 && includes(response.text, page.marker);
    checks.push(buildCheck(
      `Production page: ${page.label}`,
      success,
      `${page.path} status=${response.status} marker=${page.marker}`,
      success ? {} : { stderr: response.text.slice(0, 500) },
    ));
  }

  const sitemapResponse = await request('/sitemap.xml', {
    headers: { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' },
  });
  const sitemapHasSpots = includes(sitemapResponse.text, '/spots/');
  checks.push(buildCheck(
    'Production sitemap includes spot URLs',
    sitemapResponse.status === 200 && includes(sitemapResponse.text, '<urlset') && sitemapHasSpots,
    `status=${sitemapResponse.status} spot_urls=${sitemapHasSpots}`,
    sitemapResponse.status === 200 ? {} : { stderr: sitemapResponse.text.slice(0, 500) },
  ));

  const searchResponse = await request('/api/search?q=coffee');
  const searchSpots = Array.isArray(searchResponse.json?.spots) ? searchResponse.json.spots : [];
  checks.push(buildCheck(
    'Production search API returns spots',
    searchResponse.status === 200 && searchSpots.length > 0,
    `status=${searchResponse.status} spots=${searchSpots.length} total=${searchResponse.json?.total ?? 0}`,
    searchResponse.status === 200 ? {} : { stderr: searchResponse.text.slice(0, 500) },
  ));

  const suggestResponse = await request('/api/search/suggest?q=coffee');
  const suggestSpots = Array.isArray(suggestResponse.json?.spots) ? suggestResponse.json.spots : [];
  checks.push(buildCheck(
    'Production suggest API returns spot suggestions',
    suggestResponse.status === 200 && suggestSpots.length > 0,
    `status=${suggestResponse.status} spots=${suggestSpots.length}`,
    suggestResponse.status === 200 ? {} : { stderr: suggestResponse.text.slice(0, 500) },
  ));

  const topSlug = searchSpots[0]?.slug ?? 'lic-landing-rooftop';
  const spotResponse = await request(`/spots/${topSlug}`, {
    headers: { Accept: 'text/html' },
  });
  const spotId = extractSpotId(spotResponse.text);
  checks.push(buildCheck(
    'Production spot detail page renders',
    spotResponse.status === 200 && spotId !== null,
    `/spots/${topSlug} status=${spotResponse.status} spot_id=${spotId ?? 'missing'}`,
    spotResponse.status === 200 ? {} : { stderr: spotResponse.text.slice(0, 500) },
  ));

  const newsletterResponse = await request('/api/newsletter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });
  const newsletterOk = newsletterResponse.status === 200 && newsletterResponse.json?.success === true;
  checks.push(buildCheck(
    'Production newsletter signup works',
    newsletterOk,
    `status=${newsletterResponse.status} message=${newsletterResponse.json?.message ?? newsletterResponse.json?.error ?? 'n/a'}`,
    newsletterOk ? {} : { stderr: newsletterResponse.text.slice(0, 500) },
  ));

  if (spotId) {
    const ratingResponse = await request('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot_id: spotId,
        score: 4,
        session_id: testSessionId,
      }),
    });
    checks.push(buildCheck(
      'Production ratings API accepts spot feedback',
      ratingResponse.status === 200 && ratingResponse.json?.success === true,
      `status=${ratingResponse.status} spot_id=${spotId}`,
      ratingResponse.status === 200 ? {} : { stderr: ratingResponse.text.slice(0, 500) },
    ));

    const tipResponse = await request('/api/tips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot_id: spotId,
        text: 'Production regression tip: arrive early for the best experience.',
        author_name: 'QA',
        author_area: 'NYC',
      }),
    });
    checks.push(buildCheck(
      'Production tips API accepts local tip',
      tipResponse.status === 200 && tipResponse.json?.success === true,
      `status=${tipResponse.status} spot_id=${spotId}`,
      tipResponse.status === 200 ? {} : { stderr: tipResponse.text.slice(0, 500) },
    ));
  } else {
    checks.push(buildCheck(
      'Production ratings API accepts spot feedback',
      false,
      'skipped because spot id could not be parsed from spot page',
    ));
    checks.push(buildCheck(
      'Production tips API accepts local tip',
      false,
      'skipped because spot id could not be parsed from spot page',
    ));
  }

  const legacyRoutes = [
    { path: '/contact', label: 'legacy contact page' },
    { path: '/api/waitlist', label: 'legacy waitlist API', method: 'POST', body: { email: testEmail } },
    { path: '/api/config', label: 'legacy config API' },
  ];

  for (const route of legacyRoutes) {
    const response = await request(route.path, {
      method: route.method ?? 'GET',
      headers: route.body ? { 'Content-Type': 'application/json' } : {},
      body: route.body ? JSON.stringify(route.body) : undefined,
    });
    checks.push(buildCheck(
      `Legacy route removed: ${route.label}`,
      response.status === 404,
      `${route.path} status=${response.status}`,
    ));
  }

  if (searchSpots[0]) {
    details.push(`top search spot: ${searchSpots[0].slug} (${searchSpots[0].name ?? 'untitled'})`);
  }
  if (spotId) {
    details.push(`spot id used for feedback APIs: ${spotId}`);
  }

  const report = writeAgentReport({
    id: 'production-regression',
    title: 'Production Regression Agent Report',
    summary: 'Runs local verification plus live production checks for FinderNYC discovery pages, search APIs, and feedback endpoints.',
    checks,
    details,
    mode,
    extra: {
      baseUrl,
      skipLocal,
      qa_identity: {
        email: testEmail,
        session_id: testSessionId,
      },
      top_search_spot: searchSpots[0] ?? null,
      spot_id: spotId,
    },
  });

  console.log('Report written: output/agent-reports/production-regression.md');
  exitForStatus(report);
}

run().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  const report = writeAgentReport({
    id: 'production-regression',
    title: 'Production Regression Agent Report',
    summary: 'The production regression run crashed before completing.',
    checks: [
      buildCheck('Unhandled exception', false, 'production regression script terminated unexpectedly', { stderr: message }),
    ],
    details: [`base URL: ${baseUrl}`],
    mode,
    extra: { baseUrl },
  });
  console.log('Report written: output/agent-reports/production-regression.md');
  exitForStatus(report);
});