import { getMode, parseStringArray, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();

const contractSource = readText('src/contract.ts');
const indexSource = readText('src/index.ts');

const endpoints = [
  {
    key: 'submitLead',
    method: 'POST',
    path: '/api/leads',
    routerVar: 'leadsRouter',
    routeFile: 'src/routes/api/leads.ts',
    testFile: 'tests/unit/api-leads.test.ts',
    statusCheckLabel: 'Lead',
  },
  {
    key: 'joinWaitlist',
    method: 'POST',
    path: '/api/waitlist',
    routerVar: 'waitlistRouter',
    routeFile: 'src/routes/api/waitlist.ts',
    testFile: 'tests/unit/api-waitlist.test.ts',
    statusCheckLabel: 'Waitlist',
  },
  {
    key: 'logAnalyticsEvent',
    method: 'POST',
    path: '/api/analytics/events',
    routerVar: 'analyticsRouter',
    routeFile: 'src/routes/api/analytics.ts',
    testFile: 'tests/unit/api-analytics.test.ts',
    statusCheckLabel: 'Analytics',
  },
  {
    key: 'listSavedSearchDeliveryAttempts',
    method: 'GET',
    path: '/api/saved-searches/:id/delivery-attempts',
    routerVar: 'savedSearchesRouter',
    routeFile: 'src/routes/api/saved-searches.ts',
    testFile: 'tests/unit/api-saved-searches.test.ts',
    statusCheckLabel: 'SavedSearchDeliveryAttempts',
  },
  {
    key: 'syncRealtimeAvailability',
    method: 'POST',
    path: '/api/availability/sync',
    routerVar: 'availabilityRouter',
    routeFile: 'src/routes/api/availability.ts',
    testFile: 'tests/unit/api-availability-sync.test.ts',
    statusCheckLabel: 'AvailabilitySync',
  },
  {
    key: 'ingestAvailabilityWebhook',
    method: 'POST',
    path: '/api/availability/webhook/:provider',
    routerVar: 'availabilityRouter',
    routeFile: 'src/routes/api/availability.ts',
    testFile: 'tests/unit/api-availability-sync.test.ts',
    statusCheckLabel: 'AvailabilityWebhook',
  },
  {
    key: 'runAiFollowUpAutomation',
    method: 'POST',
    path: '/api/ai/follow-up-automation',
    routerVar: 'aiRouter',
    routeFile: 'src/routes/api/ai.ts',
    testFile: 'tests/unit/api-ai-automation.test.ts',
    statusCheckLabel: 'AiFollowUpAutomation',
  },
  {
    key: 'aiNextBestAction',
    method: 'POST',
    path: '/api/ai/next-best-action',
    routerVar: 'aiRouter',
    routeFile: 'src/routes/api/ai.ts',
    testFile: 'tests/unit/api-ai-automation.test.ts',
    statusCheckLabel: 'AiNextBestAction',
  },
  {
    key: 'getExperienceI18nByLocale',
    method: 'GET',
    path: '/api/experience/i18n/:locale',
    routerVar: 'experienceRouter',
    routeFile: 'src/routes/api/experience.ts',
    testFile: 'tests/unit/api-experience.test.ts',
    statusCheckLabel: 'ExperienceI18nByLocale',
  },
  {
    key: 'upsertAccessibilityPreferences',
    method: 'POST',
    path: '/api/experience/accessibility/preferences',
    routerVar: 'experienceRouter',
    routeFile: 'src/routes/api/experience.ts',
    testFile: 'tests/unit/api-experience.test.ts',
    statusCheckLabel: 'AccessibilityPreferences',
  },
  {
    key: 'ingestPartnerWebhookEvent',
    method: 'POST',
    path: '/api/integrations/webhooks/:partner/events',
    routerVar: 'integrationsRouter',
    routeFile: 'src/routes/api/integrations.ts',
    testFile: 'tests/unit/api-integrations.test.ts',
    statusCheckLabel: 'PartnerWebhookEvent',
  },
  {
    key: 'listUserDashboards',
    method: 'GET',
    path: '/api/dashboards',
    routerVar: 'dashboardsRouter',
    routeFile: 'src/routes/api/dashboards.ts',
    testFile: 'tests/unit/api-dashboards.test.ts',
    statusCheckLabel: 'UserDashboards',
  },
  {
    key: 'getInsightsHub',
    method: 'GET',
    path: '/api/dashboards/insights/hub',
    routerVar: 'dashboardsRouter',
    routeFile: 'src/routes/api/dashboards.ts',
    testFile: 'tests/unit/api-dashboards.test.ts',
    statusCheckLabel: 'InsightsHub',
  },
  {
    key: 'assignPartnerWorkspaceRole',
    method: 'POST',
    path: '/api/partners/workspaces/:workspace_id/members/:member_id/role',
    routerVar: 'partnersRouter',
    routeFile: 'src/routes/api/partners.ts',
    testFile: 'tests/unit/api-partners.test.ts',
    statusCheckLabel: 'PartnerWorkspaceRole',
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

function extractBracedBlock(source, openingBraceIndex) {
  let depth = 0;
  for (let i = openingBraceIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openingBraceIndex + 1, i);
      }
    }
  }
  return '';
}

function extractContractRouteBlock(source, key) {
  const keyIndex = source.indexOf(`${key}:`);
  if (keyIndex < 0) return '';
  const braceIndex = source.indexOf('{', keyIndex);
  if (braceIndex < 0) return '';
  return extractBracedBlock(source, braceIndex);
}

function extractContractResponsesBlock(routeBlock) {
  const responsesIndex = routeBlock.indexOf('responses:');
  if (responsesIndex < 0) return '';
  const braceIndex = routeBlock.indexOf('{', responsesIndex);
  if (braceIndex < 0) return '';
  return extractBracedBlock(routeBlock, braceIndex);
}

function extractContractStatuses(routeBlock) {
  const responsesBlock = extractContractResponsesBlock(routeBlock);
  if (!responsesBlock) return [];
  return unique(Array.from(responsesBlock.matchAll(/(\d{3})\s*:/g)).map((match) => Number(match[1]))).sort((a, b) => a - b);
}

function extractBodyKeysFromContract(routeBlock) {
  const bodyMatch = routeBlock.match(/body:\s*z\.object\(\{([\s\S]*?)\}\)/m);
  if (!bodyMatch) return [];
  return unique(Array.from(bodyMatch[1].matchAll(/([a-zA-Z0-9_]+)\s*:/g)).map((match) => match[1]));
}

function extractStringLiteralsFromContractResponses(routeBlock) {
  const responsesBlock = extractContractResponsesBlock(routeBlock);
  if (!responsesBlock) return [];
  return unique(Array.from(responsesBlock.matchAll(/z\.literal\('([^']+)'\)/g)).map((match) => match[1]));
}

function extractStatusesFromRouteSource(source) {
  const cJsonStatuses = Array.from(source.matchAll(/,\s*(\d{3})\)/g)).map((match) => Number(match[1]));
  const responseStatuses = Array.from(source.matchAll(/status:\s*(\d{3})/g)).map((match) => Number(match[1]));
  return unique([...cJsonStatuses, ...responseStatuses]).sort((a, b) => a - b);
}

function missingKeysInRoute(routeSource, keys) {
  return keys.filter((key) => !routeSource.includes(`${key}:`) && !routeSource.includes(`${key},`));
}

function extractRouterImports(source) {
  const map = new Map();
  for (const match of source.matchAll(/import\s+\{\s*([^}]+)\s*\}\s+from\s+'([^']+)'/g)) {
    const importedNames = match[1].split(',').map((part) => part.trim()).filter(Boolean);
    const fromPath = match[2];
    if (!fromPath.startsWith('./routes/api/')) continue;

    const tsPath = `src/${fromPath.slice(2)}.ts`;
    for (const name of importedNames) {
      map.set(name, tsPath);
    }
  }
  return map;
}

function extractMountedRouters(source) {
  return Array.from(source.matchAll(/app\.route\('([^']+)'\s*,\s*([a-zA-Z0-9_]+)\)/g)).map((match) => ({
    prefix: normalizePath(match[1]),
    routerVar: match[2],
  }));
}

function extractRoutesFromRouterSource(routerVar, routeSource, mountPrefix) {
  const routeEntries = [];
  const regex = new RegExp(`${routerVar}\\.(get|post|put|patch|delete)\\('([^']+)'`, 'g');

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

const contractPaths = unique(Array.from(contractSource.matchAll(/path:\s*'([^']+)'/g)).map((match) => normalizePath(match[1])));
const routerImportMap = extractRouterImports(indexSource);
const mountedRouters = extractMountedRouters(indexSource);
const mountedPrefixes = unique(mountedRouters.map((entry) => entry.prefix));

const routeSources = Object.fromEntries(unique(endpoints.map((endpoint) => endpoint.routeFile)).map((path) => [path, readText(path)]));
const testSources = Object.fromEntries(unique(endpoints.map((endpoint) => endpoint.testFile)).map((path) => [path, readText(path)]));

const contractEventNames = (() => {
  const enumMatch = contractSource.match(/event_name:\s*z\.enum\(\[([^\]]+)\]\)/m);
  if (!enumMatch) return [];
  return parseStringArray(enumMatch[1]);
})();

const analyticsRouteSource = routeSources['src/routes/api/analytics.ts'];
const routeEventNames = (() => {
  const enumMatch = analyticsRouteSource.match(/event_name:\s*z\.enum\(\[([^\]]+)\]\)/m);
  if (!enumMatch) return [];
  return parseStringArray(enumMatch[1]);
})();

const perEndpoint = endpoints.map((endpoint) => {
  const routeBlock = extractContractRouteBlock(contractSource, endpoint.key);
  const contractStatuses = extractContractStatuses(routeBlock);
  const contractBodyKeys = extractBodyKeysFromContract(routeBlock);
  const responseStringLiterals = extractStringLiteralsFromContractResponses(routeBlock);

  const routeSource = routeSources[endpoint.routeFile];
  const routeStatuses = extractStatusesFromRouteSource(routeSource);
  const missingBodyKeys = missingKeysInRoute(routeSource, contractBodyKeys);

  const mount = mountedRouters.find((entry) => entry.routerVar === endpoint.routerVar);
  const routeEntries = mount
    ? extractRoutesFromRouterSource(endpoint.routerVar, routeSource, mount.prefix)
    : [];

  const routeCompositionMatches = routeEntries.some(
    (entry) => entry.method === endpoint.method && normalizePath(entry.fullPath) === normalizePath(endpoint.path),
  );

  const testSource = testSources[endpoint.testFile];
  const testStatuses = extractStatusAssertionsFromTest(testSource);
  const testCoversContractStatuses = includesAll(contractStatuses, testStatuses);

  const missingLiteralChecks = responseStringLiterals.filter((value) => !testSource.includes(value));

  return {
    ...endpoint,
    routeBlock,
    contractStatuses,
    contractBodyKeys,
    responseStringLiterals,
    routeStatuses,
    missingBodyKeys,
    mountPrefix: mount?.prefix ?? null,
    routeEntries,
    routeCompositionMatches,
    testStatuses,
    testCoversContractStatuses,
    missingLiteralChecks,
  };
});

const checks = [
  {
    name: 'Contract Defines Expected API Paths',
    success: endpoints.every((endpoint) => contractPaths.includes(normalizePath(endpoint.path))),
    notes: `Contract paths: ${contractPaths.join(', ')}`,
  },
  {
    name: 'App Mounts All API Routers',
    success: endpoints.every((endpoint) => mountedRouters.some((entry) => entry.routerVar === endpoint.routerVar)),
    notes: `Mounted prefixes: ${mountedPrefixes.join(', ')}`,
  },
  {
    name: 'Analytics Enum Matches Contract and Route',
    success:
      contractEventNames.length > 0
      && routeEventNames.length > 0
      && contractEventNames.length === routeEventNames.length
      && contractEventNames.every((name) => routeEventNames.includes(name)),
    notes: `contract=[${contractEventNames.join(', ')}] route=[${routeEventNames.join(', ')}]`,
  },
  ...perEndpoint.flatMap((endpoint) => [
    {
      name: `${endpoint.statusCheckLabel} Route Composition Matches Contract Path`,
      success: endpoint.routeCompositionMatches,
      notes: endpoint.routeEntries.length > 0
        ? `mount=${endpoint.mountPrefix} routes=${endpoint.routeEntries.map((entry) => `${entry.method} ${entry.fullPath}`).join('; ')}`
        : 'No route entries detected',
    },
    {
      name: `${endpoint.statusCheckLabel} Route Statuses Cover Contract`,
      success: includesAll(endpoint.contractStatuses, endpoint.routeStatuses),
      notes: `contract=[${endpoint.contractStatuses.join(', ')}] route=[${endpoint.routeStatuses.join(', ')}]`,
    },
    {
      name: `${endpoint.statusCheckLabel} Body Keys Present in Route Validation`,
      success: endpoint.missingBodyKeys.length === 0,
      notes: endpoint.missingBodyKeys.length === 0
        ? `keys=[${endpoint.contractBodyKeys.join(', ')}]`
        : `missing=[${endpoint.missingBodyKeys.join(', ')}]`,
    },
    {
      name: `${endpoint.statusCheckLabel} API Tests Assert Contract Statuses`,
      success: endpoint.testCoversContractStatuses,
      notes: `contract=[${endpoint.contractStatuses.join(', ')}] test=[${endpoint.testStatuses.join(', ')}]`,
    },
    {
      name: `${endpoint.statusCheckLabel} API Tests Cover Contract String Literals`,
      success: endpoint.missingLiteralChecks.length === 0,
      notes: endpoint.responseStringLiterals.length === 0
        ? 'No string literals in contract responses'
        : endpoint.missingLiteralChecks.length === 0
          ? `literals=[${endpoint.responseStringLiterals.join(', ')}]`
          : `missing=[${endpoint.missingLiteralChecks.join(', ')}]`,
    },
  ]),
];

const report = writeAgentReport({
  id: 'api-contract',
  title: 'API Contract Agent Report',
  summary: 'Checks contract paths, mount+sub-route composition, response status parity, body-key drift, and API test coverage of contract statuses.',
  checks,
  mode,
  extra: {
    contractPaths,
    mountedRouters,
    perEndpoint: perEndpoint.map((endpoint) => ({
      key: endpoint.key,
      method: endpoint.method,
      path: endpoint.path,
      mountPrefix: endpoint.mountPrefix,
      routeEntries: endpoint.routeEntries,
      contractStatuses: endpoint.contractStatuses,
      routeStatuses: endpoint.routeStatuses,
      testStatuses: endpoint.testStatuses,
      contractBodyKeys: endpoint.contractBodyKeys,
      missingBodyKeys: endpoint.missingBodyKeys,
      responseStringLiterals: endpoint.responseStringLiterals,
      missingLiteralChecks: endpoint.missingLiteralChecks,
    })),
  },
});

console.log('Report written: output/agent-reports/api-contract.md');
exitForStatus(report);
