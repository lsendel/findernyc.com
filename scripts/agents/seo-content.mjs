import { getMode, readText, runCommand, writeAgentReport, exitForStatus } from './lib.mjs';

const mode = getMode();

const indexSource = readText('src/index.ts');
const landingSource = readText('src/templates/landing.ts');
const layoutSource = readText('src/templates/layout.ts');
const contentSource = readText('src/templates/content.ts');
const searchSource = readText('src/templates/search.ts');
const spotSource = readText('src/templates/spot.ts');
const pageSeoSource = readText('src/lib/page-seo.ts');

const pagesTest = runCommand('npx vitest run tests/unit/pages.test.ts');
const domStructureTest = runCommand('npx vitest run tests/unit/dom-structure.test.ts');

const staticPaths = [
  '/',
  '/hidden-gems',
  '/itineraries',
  '/neighborhoods',
  '/tips',
  '/about',
  '/privacy',
  '/terms',
];

const checks = [
  {
    name: 'Public Page Unit Tests',
    success: pagesTest.success,
    notes: `vitest pages (exit ${pagesTest.code})`,
    stdout: pagesTest.stdout,
    stderr: pagesTest.stderr,
  },
  {
    name: 'DOM Structure Unit Tests',
    success: domStructureTest.success,
    notes: `vitest dom-structure (exit ${domStructureTest.code})`,
    stdout: domStructureTest.stdout,
    stderr: domStructureTest.stderr,
  },
  {
    name: 'Shared SEO Head Template Present',
    success:
      layoutSource.includes('<meta name="robots"')
      && layoutSource.includes('<link rel="canonical"')
      && layoutSource.includes('og:title')
      && layoutSource.includes('twitter:card'),
    notes: 'layout.ts renders canonical, robots, Open Graph, and Twitter tags.',
  },
  {
    name: 'Page SEO Helper Truncates Descriptions',
    success:
      pageSeoSource.includes('truncateDescription')
      && pageSeoSource.includes('160'),
    notes: 'Descriptions are capped for SERP-friendly length.',
  },
  {
    name: 'Landing Page Uses Shared SEO Builder',
    success: landingSource.includes('buildPageSeo('),
    notes: 'Landing metadata is generated through page-seo.ts.',
  },
  {
    name: 'Content Templates Use Shared SEO Builder',
    success:
      contentSource.includes('buildPageSeo(')
      && searchSource.includes('buildPageSeo(')
      && spotSource.includes('buildPageSeo('),
    notes: 'Search, spot, guide, and static pages share SEO metadata generation.',
  },
  {
    name: 'Search Results Use noindex',
    success: searchSource.includes("noindex: true") || searchSource.includes('noindex,nofollow'),
    notes: 'Search result pages should not compete with canonical spot/guide URLs.',
  },
  {
    name: 'Sitemap Includes Core Static Routes',
    success: staticPaths.every((path) => indexSource.includes(`path: '${path}'`)),
    notes: `static paths checked: ${staticPaths.join(', ')}`,
  },
  {
    name: 'Sitemap Builder Includes Dynamic Spot and Guide URLs',
    success:
      indexSource.includes("SELECT slug, updated_at FROM spots WHERE published = 1")
      && indexSource.includes("SELECT slug, COALESCE(updated_at, published_at, created_at)")
      && indexSource.includes('sitemapXml'),
    notes: 'Dynamic sitemap entries are generated from published spots and guides.',
  },
  {
    name: 'robots.txt and llms.txt Routes Exist',
    success:
      indexSource.includes("app.get('/robots.txt'")
      && indexSource.includes("app.get('/llms.txt'")
      && indexSource.includes('Sitemap:'),
    notes: 'Crawler hints are served directly from the worker.',
  },
];

const details = [
  `static sitemap paths checked: ${staticPaths.length}`,
  'SEO agent now validates the FinderNYC discovery templates instead of removed contact/content-page modules.',
];

const report = writeAgentReport({
  id: 'seo-content',
  title: 'SEO Content Agent Report',
  summary: 'Validates shared SEO metadata, crawl hints, sitemap strategy, and page-level test coverage for the FinderNYC pivot.',
  checks,
  details,
  mode,
  extra: {
    staticPaths,
    pagesTestExit: pagesTest.code,
    domStructureTestExit: domStructureTest.code,
  },
});

console.log('Report written: output/agent-reports/seo-content.md');
exitForStatus(report);