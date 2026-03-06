import { getMode, parseStringArray, readText, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();

const mainSource = readText('src/assets/js/main.ts');
const contractSource = readText('src/contract.ts');
const landingSource = readText('src/templates/landing.ts');
const analyticsUnitTestSource = readText('tests/unit/api-analytics.test.ts');
const analyticsPropertyTestSource = readText('tests/property/analytics.property.test.ts');

function unique(values) {
  return Array.from(new Set(values));
}

function extractEventLiterals(source) {
  return unique(Array.from(source.matchAll(/event_name:\s*'([^']+)'/g)).map((match) => match[1]));
}

function extractContractEvents(source) {
  const match = source.match(/event_name:\s*z\.enum\(\[([^\]]+)\]\)/m);
  if (!match) return [];
  return unique(parseStringArray(match[1]));
}

function extractCtaAttrs(source) {
  const attrs = [];
  const regex = /<[^>]*data-cta="([^"]+)"[^>]*>/g;
  let match;
  while ((match = regex.exec(source)) !== null) {
    const tag = match[0];
    const cta = match[1];
    const sectionMatch = tag.match(/data-section="([^"]+)"/);
    attrs.push({ cta, section: sectionMatch ? sectionMatch[1] : null, rawTag: tag });
  }
  return attrs;
}

function extractAllDataSections(source) {
  return unique(Array.from(source.matchAll(/data-section="([^"]+)"/g)).map((match) => match[1]));
}

function eventHasPropertyInClient(source, eventName, propertyName) {
  const regex = new RegExp(`event_name:\\s*'${eventName}'[\\s\\S]{0,260}?properties:\\s*\\{[\\s\\S]{0,220}?\\b${propertyName}\\b`, 'm');
  return regex.test(source);
}

const requiredEventProperties = {
  cta_click: ['cta_label', 'section'],
  section_view: ['section_name'],
  faq_expand: ['question_index'],
  pricing_tab_view: ['tab_name'],
  search_query: ['query_text', 'result_count'],
  search_result_click: ['query_text', 'event_id', 'rank_position'],
};

const clientEventNames = extractEventLiterals(mainSource);
const contractEventNames = extractContractEvents(contractSource);
const ctaAttrs = extractCtaAttrs(landingSource);
const allDataSections = extractAllDataSections(landingSource);

const missingFromContract = clientEventNames.filter((name) => !contractEventNames.includes(name));
const unknownFromTests = unique([
  ...extractEventLiterals(analyticsUnitTestSource),
  ...extractEventLiterals(analyticsPropertyTestSource),
]).filter((name) => !contractEventNames.includes(name));

const ctaMissingSection = ctaAttrs.filter((entry) => !entry.section);
const ctaOrphanSection = ctaAttrs.filter((entry) => entry.section && !allDataSections.includes(entry.section));

const propertyCoverage = Object.entries(requiredEventProperties).map(([eventName, properties]) => ({
  eventName,
  properties,
  missingProperties: properties.filter((property) => !eventHasPropertyInClient(mainSource, eventName, property)),
}));

const checks = [
  {
    name: 'Client Event Names Covered by Contract Enum',
    success: missingFromContract.length === 0,
    notes: missingFromContract.length === 0
      ? `client=[${clientEventNames.join(', ')}]`
      : `missing from contract: ${missingFromContract.join(', ')}`,
  },
  {
    name: 'Client Event Payloads Include Required Properties',
    success: propertyCoverage.every((item) => item.missingProperties.length === 0),
    notes: propertyCoverage
      .map((item) => `${item.eventName}:${item.missingProperties.length === 0 ? 'ok' : `missing(${item.missingProperties.join(',')})`}`)
      .join(' | '),
  },
  {
    name: 'Search Result Click Carries Neighborhood Fit Feedback Context',
    success:
      mainSource.includes('neighborhood_fit_score')
      && mainSource.includes('neighborhood_fit_band')
      && mainSource.includes('neighborhood_fit_dominant_vibe')
      && mainSource.includes('neighborhood_fit_personalized'),
    notes: 'Checks post-click neighborhood fit fields used by weekly retraining.',
  },
  {
    name: 'Do Not Track Guard Exists in initAnalytics',
    success: mainSource.includes("navigator.doNotTrack === '1'") && mainSource.includes('pageState.dnt = true'),
    notes: 'Checks DNT signal handling in analytics initialization',
  },
  {
    name: 'Do Not Track Guard Exists in trackEvent',
    success: mainSource.includes('if (pageState.dnt) return;') && mainSource.includes("fetch('/api/analytics/events'"),
    notes: 'Checks behavioral analytics suppression before network call',
  },
  {
    name: 'CTA Tags Carry data-section for Attribution',
    success: ctaMissingSection.length === 0,
    notes: ctaMissingSection.length === 0
      ? `${ctaAttrs.length} CTA tags validated`
      : `${ctaMissingSection.length} CTA tags missing data-section`,
  },
  {
    name: 'No Orphan CTA data-section Labels',
    success: ctaOrphanSection.length === 0,
    notes: ctaOrphanSection.length === 0
      ? `${allDataSections.length} data-section labels available`
      : `orphan sections: ${ctaOrphanSection.map((entry) => entry.section).join(', ')}`,
  },
  {
    name: 'Unknown Events Observed Only in Test Fixtures',
    success: true,
    notes: unknownFromTests.length === 0
      ? 'No unknown event names found in analytics tests'
      : `unknown events in tests: ${unknownFromTests.join(', ')}`,
  },
];

const details = [
  `Contract events: ${contractEventNames.join(', ')}`,
  `Client events: ${clientEventNames.join(', ')}`,
  `CTA elements scanned: ${ctaAttrs.length}`,
  `data-section labels discovered: ${allDataSections.join(', ')}`,
];

for (const item of propertyCoverage) {
  details.push(
    `${item.eventName} required properties: ${item.properties.join(', ')} | missing: ${item.missingProperties.length === 0 ? 'none' : item.missingProperties.join(', ')}`,
  );
}

if (ctaMissingSection.length > 0) {
  details.push(`CTA missing section labels: ${ctaMissingSection.map((entry) => entry.cta).join(', ')}`);
}

if (ctaOrphanSection.length > 0) {
  details.push(`CTA orphan section labels: ${ctaOrphanSection.map((entry) => `${entry.cta}:${entry.section}`).join(', ')}`);
}

if (unknownFromTests.length > 0) {
  details.push(`Unknown event references found in test fixtures: ${unknownFromTests.join(', ')}`);
}

const report = writeAgentReport({
  id: 'analytics-integrity',
  title: 'Analytics Integrity Agent Report',
  summary: 'Validates event taxonomy consistency, required event properties, DNT compliance, CTA attribution quality, and unknown test-fixture events.',
  checks,
  details,
  mode,
  extra: {
    contractEventNames,
    clientEventNames,
    unknownFromTests,
    ctaAttrs,
    allDataSections,
    propertyCoverage,
  },
});

console.log('Report written: output/agent-reports/analytics-integrity.md');
exitForStatus(report);
