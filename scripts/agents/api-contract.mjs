import { getMode, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();

const indexSource = readText('src/index.ts');

const endpoints = [
  {
    key: 'search',
    method: 'GET',
    path: '/api/search',
    routerVar: 'searchRouter',
    routeFile: 'src/routes/api/search.ts',
    testFile: 'tests/unit/api-search.test.ts',
    statusCheckLabel: 'Search',
    expectedStatuses: [200, 500],
  },
  {
    key: 'searchSuggest',
    method: 'GET',
    path: '/api/search/suggest',
    routerVar: 'searchRouter',
    routeFile: 'src/routes/api/search.ts',
    testFile: 'tests/unit/api-search.test.ts',
    statusCheckLabel: 'SearchSuggest',
    expectedStatuses: [200, 500],
  },
  {
    key: 'ratings',
    method: 'POST',
    path: '/api/ratings',
    routerVar: 'ratingsRouter',
    routeFile: 'src/routes/api/ratings.ts',
    testFile: 'tests/unit/api-feedback.test.ts',
    statusCheckLabel: 'Ratings',
    expectedStatuses: [200, 400, 503, 500],
  },
  {
    key: 'tips',
    method: 'POST',
    path: '/api/tips',
    routerVar: 'tipsRouter',
    routeFile: 'src/routes/api/tips.ts',
    testFile: 'tests/unit/api-feedback.test.ts',
    statusCheckLabel: 'Tips',
    expectedStatuses: [200, 400, 503, 500],
  },
  {
    key: 'newsletter',
    method: 'POST',
    path: '/api/newsletter',
    routerVar: 'newsletterRouter',
    routeFile: 'src/routes/api/newsletter.ts',
    testFile: 'tests/unit/api-feedback.test.ts',
    statusCheckLabel: 'Newsletter',
    expectedStatuses: [200, 400, 503, 500],
  },
];

function unique(values) {
  return Array.from(new Set(values));
}

function includesAll(expected, actual) {
  return expected.every((value) => actual.includes(value));
}

function normalizePath(path) {
  if (!path) return '/';
  const squashed = path.replace(/\/+/g, '/');
  if (squashed !== '/' && squashed.endsWith('/')) {
    return squashed.slice(0, -1);
  }
  return squashed;
}

function joinPath(prefix, child) {
  if (child === '/') return normalizePath(prefix);
  const joined = `${prefix}${child.startsWith('/') ? child : `/${child}`}`;
  return normalizePath(joined);
}

function extractStatusesFromRouteSource(source) {
  const cJsonStatuses = Array.from(source.matchAll(/,\s*(\d{3})\)/g)).map((match) => Number(match[1]));
  const responseStatuses = Array.from(source.matchAll(/status:\s*(\d{3})/g)).map((match) => Number(match[1]));
  const statuses = unique([...cJsonStatuses, ...responseStatuses]);
  if (source.includes('c.json(') || source.includes('return c.json')) {
    statuses.push(200);
  }
  return unique(statuses).sort((a, b) => a - b);
}

function extractMountedRouters(source) {
  return Array.from(source.matchAll(/app\.route\('([^']+)'\s*,\s*([a-zA-Z0-9_]+)\)/g)).map((match) => ({
    prefix: normalizePath(match[1]),
    routerVar: match[2],
  }));
}

function extractRoutesFromRouterSource(routeSource, mountPrefix) {
  const routeEntries = [];
  const regex = /router\.(get|post|put|patch|delete)\('([^']+)'/g;

  for (const match of routeSource.matchAll(regex)) {
    routeEntries.push({
      method: match[1].toUpperCase(),
      subPath: normalizePath(match[2]),
      fullPath: joinPath(mountPrefix, match[2]),
    });
  }

  return routeEntries;
}

function extractStatusAssertionsFromTest(source) {
  const statuses = Array.from(source.matchAll(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\.status\)\.toBe\((\d{3})\)/g))
    .map((match) => Number(match[1]));
  return unique(statuses).sort((a, b) => a - b);
}

const mountedRouters = extractMountedRouters(indexSource);
const mountedPrefixes = unique(mountedRouters.map((entry) => entry.prefix));

const routeSources = Object.fromEntries(
  unique(endpoints.map((endpoint) => endpoint.routeFile)).map((path) => [path, readText(path)]),
);
const testSources = Object.fromEntries(
  unique(endpoints.map((endpoint) => endpoint.testFile)).map((path) => [path, readText(path)]),
);

const perEndpoint = endpoints.map((endpoint) => {
  const routeSource = routeSources[endpoint.routeFile];
  const routeStatuses = extractStatusesFromRouteSource(routeSource);

  const mount = mountedRouters.find((entry) => entry.routerVar === endpoint.routerVar);
  const routeEntries = mount
    ? extractRoutesFromRouterSource(routeSource, mount.prefix)
    : [];

  const routeCompositionMatches = routeEntries.some(
    (entry) => entry.method === endpoint.method && normalizePath(entry.fullPath) === normalizePath(endpoint.path),
  );

  const testSource = testSources[endpoint.testFile];
  const testStatuses = extractStatusAssertionsFromTest(testSource);
  const testCoversHappyPath = testStatuses.includes(200);

  return {
    ...endpoint,
    routeStatuses,
    mountPrefix: mount?.prefix ?? null,
    routeEntries,
    routeCompositionMatches,
    testStatuses,
    testCoversHappyPath,
    routeStatusesCoverContract: includesAll(endpoint.expectedStatuses, routeStatuses),
  };
});

const checks = [
  {
    name: 'App Mounts All API Routers',
    success: endpoints.every((endpoint) => mountedRouters.some((entry) => entry.routerVar === endpoint.routerVar)),
    notes: `Mounted prefixes: ${mountedPrefixes.join(', ')}`,
  },
  ...perEndpoint.flatMap((endpoint) => [
    {
      name: `${endpoint.statusCheckLabel} Route Composition Matches Expected Path`,
      success: endpoint.routeCompositionMatches,
      notes: endpoint.routeEntries.length > 0
        ? `mount=${endpoint.mountPrefix} routes=${endpoint.routeEntries.map((entry) => `${entry.method} ${entry.fullPath}`).join('; ')}`
        : 'No route entries detected',
    },
    {
      name: `${endpoint.statusCheckLabel} Route Statuses Cover Expected Responses`,
      success: endpoint.routeStatusesCoverContract,
      notes: `expected=[${endpoint.expectedStatuses.join(', ')}] route=[${endpoint.routeStatuses.join(', ')}]`,
    },
    {
      name: `${endpoint.statusCheckLabel} API Tests Assert Happy-Path Status`,
      success: endpoint.testCoversHappyPath,
      notes: `test statuses=[${endpoint.testStatuses.join(', ')}]`,
    },
    {
      name: `${endpoint.statusCheckLabel} API Tests Reference Route Path`,
      success: testSources[endpoint.testFile].includes(endpoint.path),
      notes: `path=${endpoint.path}`,
    },
  ]),
];

const report = writeAgentReport({
  id: 'api-contract',
  title: 'API Contract Agent Report',
  summary: 'Checks mounted API routes, response status coverage, and unit-test alignment for the FinderNYC discovery and feedback surface.',
  checks,
  mode,
  extra: {
    mountedRouters,
    perEndpoint: perEndpoint.map((endpoint) => ({
      key: endpoint.key,
      method: endpoint.method,
      path: endpoint.path,
      mountPrefix: endpoint.mountPrefix,
      routeEntries: endpoint.routeEntries,
      expectedStatuses: endpoint.expectedStatuses,
      routeStatuses: endpoint.routeStatuses,
      testStatuses: endpoint.testStatuses,
    })),
  },
});

console.log('Report written: output/agent-reports/api-contract.md');
exitForStatus(report);