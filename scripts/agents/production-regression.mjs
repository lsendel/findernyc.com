import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getMode, writeAgentReport, exitForStatus } from './lib.mjs';

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
const testEmail = process.env.QA_TEST_EMAIL ?? 'regression+findernyc@example.com';
const testFullName = process.env.QA_TEST_FULL_NAME ?? 'FinderNYC QA';
const testPhone = process.env.QA_TEST_PHONE ?? '2125550100';
const testCity = process.env.QA_TEST_CITY ?? 'New York';
const testZip = process.env.QA_TEST_ZIP ?? '10001';
const testSessionId = process.env.QA_TEST_SESSION_ID ?? 'prod-regression-session';
const testGoal = process.env.QA_TEST_GOAL ?? 'Validate the public discovery journey from landing page to inquiry and scheduling.';
const cookieJar = new Map();

function makeHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    'User-Agent': 'findernyc-production-regression/1.0',
    ...extra,
  };
}

async function request(path, options = {}) {
  const headers = makeHeaders(options.headers);
  if (cookieJar.size > 0) {
    headers.Cookie = Array.from(cookieJar.entries()).map(([name, value]) => `${name}=${value}`).join('; ');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'follow',
    ...options,
    headers,
  });

  const setCookieHeader = response.headers.get('set-cookie');
  if (setCookieHeader) {
    const firstCookie = setCookieHeader.split(';')[0];
    const separatorIndex = firstCookie.indexOf('=');
    if (separatorIndex > 0) {
      const name = firstCookie.slice(0, separatorIndex).trim();
      const value = firstCookie.slice(separatorIndex + 1).trim();
      if (name && value) {
        cookieJar.set(name, value);
      }
    }
  }

  const contentType = response.headers.get('content-type') ?? '';
  const bodyText = await response.text();
  let json;
  if (contentType.includes('application/json')) {
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

function buildCheck(name, success, notes, extra = {}) {
  return {
    name,
    success,
    notes,
    ...extra,
  };
}

function summarizeStatus(response) {
  return `status=${response.status}`;
}

function expectIncludes(response, marker) {
  return typeof response.text === 'string' && response.text.includes(marker);
}

function createFutureWindow() {
  const start = new Date(Date.now() + (48 * 60 + 17) * 60 * 1000);
  start.setUTCMinutes(start.getUTCMinutes() + (start.getUTCMinutes() % 7));
  start.setUTCSeconds(0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return {
    start_at: start.toISOString(),
    end_at: end.toISOString(),
  };
}

async function run() {
  const checks = [];
  const details = [
    `base URL: ${baseUrl}`,
    `env file loaded: ${existsSync(ENV_PATH)}`,
    `QA email: ${testEmail}`,
    `QA session id: ${testSessionId}`,
  ];

  const pageChecks = [
    { path: '/', marker: 'Discover Hidden Local Gems Right in Your City' },
    { path: '/contact', marker: 'Contact LocalGems and Join the Waitlist' },
    { path: '/blog', marker: 'Local Event Discovery Blog' },
    { path: '/blog/local-event-discovery-guide', marker: 'Local Event Discovery Guide' },
    { path: '/analytics', marker: 'Analytics Add-Ons' },
    { path: '/partnership', marker: 'Event Coordinator Partnership Program' },
    { path: '/robots.txt', marker: 'User-agent:' },
    { path: '/sitemap.xml', marker: '<urlset' },
  ];

  for (const page of pageChecks) {
    const response = await request(page.path, {
      headers: page.path.endsWith('.xml')
        ? { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' }
        : {},
    });
    const success = response.status === 200 && expectIncludes(response, page.marker);
    checks.push(buildCheck(
      `Public route ${page.path}`,
      success,
      `${summarizeStatus(response)} marker="${page.marker}" present=${expectIncludes(response, page.marker)}`,
      response.status === 200 ? {} : { stderr: response.text.slice(0, 800) },
    ));
  }

  const opsResponse = await request('/ops');
  checks.push(buildCheck(
    'Ops route remains protected',
    opsResponse.status === 401 || opsResponse.status === 503,
    `${summarizeStatus(opsResponse)} expected 401 or 503 without token`,
    opsResponse.status === 401 || opsResponse.status === 503 ? {} : { stderr: opsResponse.text.slice(0, 800) },
  ));

  const configResponse = await request('/api/config', { method: 'GET' });
  const featureFlags = configResponse.json?.feature_flags;
  checks.push(buildCheck(
    'Runtime config endpoint responds',
    configResponse.status === 200 && featureFlags && featureFlags.unified_smart_search === true,
    `${summarizeStatus(configResponse)} unified_smart_search=${featureFlags?.unified_smart_search}`,
    configResponse.status === 200 ? {} : { stderr: configResponse.text.slice(0, 800) },
  ));

  const waitlistResponse = await request('/api/waitlist', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      city: testCity,
      zip_code: testZip,
      use_case: 'consumer_discovery',
      team_size: 'solo',
      goal: testGoal,
    }),
  });
  checks.push(buildCheck(
    'Waitlist intake accepts QA identity',
    waitlistResponse.status === 201 && waitlistResponse.json?.success === true,
    `${summarizeStatus(waitlistResponse)} route=${waitlistResponse.json?.follow_up?.route ?? 'n/a'}`,
    waitlistResponse.status === 201 ? {} : { stderr: waitlistResponse.text.slice(0, 800) },
  ));

  const leadResponse = await request('/api/leads', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      city: testCity,
      borough: 'manhattan',
      use_case: 'marketing_analytics',
      team_size: 'small_2_10',
      goal: 'Run a regression check against the production marketing and inquiry flows.',
      source_cta: 'qa-regression',
      source_section: 'automation',
    }),
  });
  const leadAccepted = (
    (leadResponse.status === 201 && leadResponse.json?.success === true)
    || (leadResponse.status === 409 && leadResponse.json?.error === 'email_exists')
  );
  checks.push(buildCheck(
    'Lead capture is healthy or idempotent',
    leadAccepted,
    `${summarizeStatus(leadResponse)} outcome=${leadResponse.json?.error ?? (leadResponse.json?.success ? 'created' : 'unknown')}`,
    leadAccepted ? {} : { stderr: leadResponse.text.slice(0, 800) },
  ));

  const searchResponse = await request('/api/search', {
    method: 'POST',
    body: JSON.stringify({
      query: 'free live music tonight',
      filters: {
        borough: 'brooklyn',
        category: 'music',
      },
      commute_profile: {
        home_borough: 'manhattan',
        work_borough: 'brooklyn',
        profile_anchor: 'balanced',
        departure_hour: 18,
      },
      neighborhood_profile: {
        preferred_vibes: ['creative', 'nightlife'],
        preferred_boroughs: ['brooklyn', 'manhattan'],
        crowd_tolerance: 'medium',
        budget_preference: 'value',
      },
      session_id: testSessionId,
      limit: 5,
    }),
  });
  const firstResult = Array.isArray(searchResponse.json?.results) ? searchResponse.json.results[0] : undefined;
  checks.push(buildCheck(
    'Search returns ranked results',
    searchResponse.status === 200 && Array.isArray(searchResponse.json?.results) && searchResponse.json.results.length > 0,
    `${summarizeStatus(searchResponse)} results=${Array.isArray(searchResponse.json?.results) ? searchResponse.json.results.length : 0}`,
    searchResponse.status === 200 ? {} : { stderr: searchResponse.text.slice(0, 800) },
  ));

  let savedSearchId;
  if (firstResult?.id) {
    const savedSearchResponse = await request('/api/saved-searches', {
      method: 'POST',
      body: JSON.stringify({
        query_text: 'free live music tonight',
        filters: {
          borough: 'brooklyn',
          category: 'music',
        },
        channel: 'email',
        destination: testEmail,
        session_id: testSessionId,
      }),
    });
    savedSearchId = savedSearchResponse.json?.id;
    checks.push(buildCheck(
      'Saved search creation succeeds',
      savedSearchResponse.status === 201 && savedSearchResponse.json?.success === true,
      `${summarizeStatus(savedSearchResponse)} saved_search_id=${savedSearchId ?? 'n/a'}`,
      savedSearchResponse.status === 201 ? {} : { stderr: savedSearchResponse.text.slice(0, 800) },
    ));

    const listSavedSearchesResponse = await request('/api/saved-searches', { method: 'GET' });
    const savedSearches = Array.isArray(listSavedSearchesResponse.json?.items) ? listSavedSearchesResponse.json.items : [];
    const savedSearchVisible = typeof savedSearchId === 'number'
      ? savedSearches.some((item) => item.id === savedSearchId)
      : savedSearches.some((item) => item.destination === testEmail && item.query_text === 'free live music tonight');
    checks.push(buildCheck(
      'Saved search appears in list',
      listSavedSearchesResponse.status === 200 && savedSearchVisible,
      `${summarizeStatus(listSavedSearchesResponse)} visible=${savedSearchVisible}`,
      listSavedSearchesResponse.status === 200 ? {} : { stderr: listSavedSearchesResponse.text.slice(0, 800) },
    ));
  } else {
    checks.push(buildCheck(
      'Saved search creation succeeds',
      false,
      'skipped because search did not return a usable event id',
    ));
    checks.push(buildCheck(
      'Saved search appears in list',
      false,
      'skipped because search did not return a usable event id',
    ));
  }

  let inquiryId;
  if (firstResult?.id) {
    const inquiryResponse = await request('/api/inquiries/one-click', {
      method: 'POST',
      body: JSON.stringify({
        event_id: firstResult.id,
        session_id: testSessionId,
        autofill_from_session: true,
        profile: {
          full_name: testFullName,
          email: testEmail,
          phone: testPhone,
          preferred_contact_channel: 'email',
          note: 'Production regression smoke test inquiry.',
        },
        message: 'Please use this inquiry to verify the end-to-end production smoke flow.',
      }),
    });
    inquiryId = inquiryResponse.json?.inquiry?.id;
    checks.push(buildCheck(
      'One-click inquiry succeeds',
      inquiryResponse.status === 201 && inquiryResponse.json?.success === true && Boolean(inquiryId),
      `${summarizeStatus(inquiryResponse)} inquiry_id=${inquiryId ?? 'n/a'} event_id=${firstResult.id}`,
      inquiryResponse.status === 201 ? {} : { stderr: inquiryResponse.text.slice(0, 800) },
    ));
  } else {
    checks.push(buildCheck(
      'One-click inquiry succeeds',
      false,
      'skipped because search did not return a usable event id',
    ));
  }

  if (firstResult?.id && inquiryId) {
    const { start_at, end_at } = createFutureWindow();
    const schedulingResponse = await request('/api/scheduling/calendar-sync', {
      method: 'POST',
      body: JSON.stringify({
        inquiry_id: inquiryId,
        event_id: firstResult.id,
        session_id: testSessionId,
        provider: 'google_calendar',
        start_at,
        end_at,
        timezone: 'America/New_York',
        notes: 'Production regression scheduling smoke test.',
      }),
    });
    checks.push(buildCheck(
      'Calendar sync scheduling succeeds',
      schedulingResponse.status === 201 && schedulingResponse.json?.success === true,
      `${summarizeStatus(schedulingResponse)} delivery=${schedulingResponse.json?.schedule?.delivery ?? 'n/a'}`,
      schedulingResponse.status === 201 ? {} : { stderr: schedulingResponse.text.slice(0, 800) },
    ));
  } else {
    checks.push(buildCheck(
      'Calendar sync scheduling succeeds',
      false,
      'skipped because inquiry creation did not complete',
    ));
  }

  if (firstResult?.id) {
    details.push(`search top result: ${firstResult.id} (${firstResult.title ?? 'untitled'})`);
  }
  if (savedSearchId !== undefined) {
    details.push(`saved search id: ${savedSearchId}`);
  }
  if (inquiryId) {
    details.push(`inquiry id: ${inquiryId}`);
  }

  const report = writeAgentReport({
    id: 'production-regression',
    title: 'Production Regression Agent Report',
    summary: 'Exercises the live public journey from landing and content routes through waitlist, lead capture, search, saved search, inquiry, and scheduling APIs.',
    checks,
    details,
    mode,
    extra: {
      baseUrl,
      qa_identity: {
        email: testEmail,
        city: testCity,
        zip: testZip,
        session_id: testSessionId,
      },
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
    extra: {
      baseUrl,
      qa_identity: {
        email: testEmail,
        city: testCity,
        zip: testZip,
        session_id: testSessionId,
      },
    },
  });
  console.log('Report written: output/agent-reports/production-regression.md');
  exitForStatus(report);
});
