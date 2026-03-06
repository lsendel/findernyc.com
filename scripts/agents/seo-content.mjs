import { getMode, readText, runCommand, writeAgentReport, exitForStatus } from './lib.mjs';
import * as ts from 'typescript';

const mode = getMode();

const indexSource = readText('src/index.ts');
const landingSource = readText('src/templates/landing.ts');
const contactSource = readText('src/templates/contact.ts');
const contentPageSource = readText('src/templates/content-page.ts');

const seoRoutesTest = runCommand('npx vitest run tests/unit/seo-routes.test.ts');
const seoHeadTest = runCommand('npx vitest run tests/unit/seo-head.test.ts');

function unique(values) {
  return Array.from(new Set(values));
}

function toDate(value) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(a, b) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function readConstString(source, name) {
  const match = source.match(new RegExp(`const\\s+${name}\\s*=\\s*'([^']+)'`));
  return match ? match[1] : null;
}

function readStringLiteral(expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isTemplateExpression(expression)) {
    if (expression.templateSpans.length === 0) return expression.head.text;
    return null;
  }
  return null;
}

function readBooleanLiteral(expression) {
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  return false;
}

function extractContentPages(source) {
  const sourceFile = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let contentPagesArray = null;

  function visit(node) {
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.name.text === 'contentPages'
      && node.initializer
      && ts.isArrayLiteralExpression(node.initializer)
    ) {
      contentPagesArray = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  if (!contentPagesArray) return [];

  const pages = [];
  for (const entry of contentPagesArray.elements) {
    if (!ts.isObjectLiteralExpression(entry)) continue;
    const page = {
      path: null,
      title: null,
      description: null,
      publishedAt: null,
      updatedAt: null,
      noindex: false,
    };

    for (const prop of entry.properties) {
      if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) continue;
      const key = prop.name.text;
      if (key === 'path') {
        page.path = readStringLiteral(prop.initializer);
      } else if (key === 'title') {
        page.title = readStringLiteral(prop.initializer);
      } else if (key === 'description') {
        page.description = readStringLiteral(prop.initializer);
      } else if (key === 'publishedAt') {
        page.publishedAt = readStringLiteral(prop.initializer);
      } else if (key === 'updatedAt') {
        page.updatedAt = readStringLiteral(prop.initializer);
      } else if (key === 'noindex') {
        page.noindex = readBooleanLiteral(prop.initializer);
      }
    }

    pages.push(page);
  }

  return pages;
}

const defaultPublishedAt = readConstString(indexSource, 'DEFAULT_PAGE_PUBLISHED_AT');
const defaultUpdatedAt = readConstString(indexSource, 'DEFAULT_PAGE_UPDATED_AT');
const defaultBlogUpdatedAtMatch = indexSource.match(
  /updatedAt:\s*page\.updatedAt\s*\?\?\s*\(page\.path\.startsWith\('\/blog'\)\s*\?\s*'([^']+)'\s*:\s*DEFAULT_PAGE_UPDATED_AT\)/,
);
const defaultBlogUpdatedAt = defaultBlogUpdatedAtMatch ? defaultBlogUpdatedAtMatch[1] : defaultUpdatedAt;

const pages = extractContentPages(indexSource).map((page) => ({
  ...page,
  datePublished: page.publishedAt ?? defaultPublishedAt,
  dateModified: page.updatedAt ?? (page.path?.startsWith('/blog') ? defaultBlogUpdatedAt : defaultUpdatedAt),
}));

const pagePaths = pages.map((page) => page.path).filter(Boolean);
const duplicatePaths = pagePaths.filter((path, idx) => pagePaths.indexOf(path) !== idx);

const pagesMissingCoreMeta = pages.filter((page) => !page.path || !page.title || !page.description);
const pagesWithShortDescription = pages.filter((page) => (page.description?.length ?? 0) < 80);
const pagesWithLongTitle = pages.filter((page) => (page.title?.length ?? 0) > 70);

const blogPages = pages.filter((page) => page.path?.startsWith('/blog/'));
const freshnessWindowDays = 365;
const now = new Date();

const blogDateIssues = [];
for (const page of blogPages) {
  if (!page.datePublished || !page.dateModified) {
    blogDateIssues.push(`${page.path}: missing datePublished/dateModified`);
    continue;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(page.datePublished) || !/^\d{4}-\d{2}-\d{2}$/.test(page.dateModified)) {
    blogDateIssues.push(`${page.path}: invalid date format (expected YYYY-MM-DD)`);
    continue;
  }

  const published = toDate(page.datePublished);
  const modified = toDate(page.dateModified);

  if (!published || !modified) {
    blogDateIssues.push(`${page.path}: unparsable date values`);
    continue;
  }

  if (modified.getTime() < published.getTime()) {
    blogDateIssues.push(`${page.path}: dateModified earlier than datePublished`);
  }

  const modifiedAge = daysBetween(modified, now);
  if (modifiedAge > freshnessWindowDays) {
    blogDateIssues.push(`${page.path}: stale content (${modifiedAge} days old)`);
  }

  if (modifiedAge < -1) {
    blogDateIssues.push(`${page.path}: dateModified is in the future`);
  }
}

const noindexPages = pages.filter((page) => page.noindex).map((page) => page.path).filter(Boolean);
const sitemapPathsExpressionExists = indexSource.includes("const sitemapPaths = ['/', '/contact', ...contentPages.map((page) => page.path)];");
const sitemapEntriesExpressionExists = indexSource.includes('const sitemapEntries: SitemapEntry[] = [')
  && indexSource.includes('...contentPagesWithFreshness.map((page) => ({')
  && indexSource.includes('lastModified: page.updatedAt');

const noindexSitemapLeaks = noindexPages.filter((path) => {
  if (!path) return false;
  if (sitemapPathsExpressionExists || sitemapEntriesExpressionExists) return false;
  return indexSource.includes(path);
});

const canonicalAndRobotsChecks = {
  landingCanonical: landingSource.includes('<link rel="canonical" href="${canonical}">'),
  landingRobots:
    landingSource.includes('<meta name="robots" content="index,follow')
    || landingSource.includes('<meta name="robots" content="${robots}">'),
  contactCanonical: contactSource.includes('<link rel="canonical" href="${canonical}">'),
  contactRobots: contactSource.includes('<meta name="robots" content="index,follow">'),
  contentTemplateCanonical: contentPageSource.includes('<link rel="canonical" href="${canonical}">'),
  contentTemplateRobots: contentPageSource.includes('<meta name="robots" content="${robots}">'),
  noindexToggle: contentPageSource.includes("const robots = page.noindex ? 'noindex,nofollow' : 'index,follow';"),
};

const llmsHasPrimaryUrlsSection = contentPageSource.includes('## Primary URLs');
const llmsHasCorePaths = ['/about', '/blog', '/contact', '/analytics', '/partnership'].every((path) => contentPageSource.includes(path));

const checks = [
  {
    name: 'SEO Route Unit Tests',
    success: seoRoutesTest.success,
    notes: `vitest seo-routes (exit ${seoRoutesTest.code})`,
    stdout: seoRoutesTest.stdout,
    stderr: seoRoutesTest.stderr,
  },
  {
    name: 'SEO Head Unit Tests',
    success: seoHeadTest.success,
    notes: `vitest seo-head (exit ${seoHeadTest.code})`,
    stdout: seoHeadTest.stdout,
    stderr: seoHeadTest.stderr,
  },
  {
    name: 'Metadata Present for Every Content Page',
    success: pagesMissingCoreMeta.length === 0,
    notes: pagesMissingCoreMeta.length === 0
      ? `${pages.length} pages with path/title/description`
      : `${pagesMissingCoreMeta.length} pages missing core metadata`,
  },
  {
    name: 'Content Page Descriptions Have SEO Length Signal',
    success: pagesWithShortDescription.length === 0,
    notes: pagesWithShortDescription.length === 0
      ? 'All content-page descriptions are >= 80 chars'
      : `${pagesWithShortDescription.length} pages have descriptions < 80 chars`,
  },
  {
    name: 'Content Page Titles Stay Reasonable Length',
    success: pagesWithLongTitle.length === 0,
    notes: pagesWithLongTitle.length === 0
      ? 'All content-page titles <= 70 chars'
      : `${pagesWithLongTitle.length} pages have titles > 70 chars`,
  },
  {
    name: 'Content Page Paths Are Unique',
    success: duplicatePaths.length === 0,
    notes: duplicatePaths.length === 0 ? `${pagePaths.length} unique paths` : `duplicates=${unique(duplicatePaths).join(', ')}`,
  },
  {
    name: 'Blog Pages Have Fresh Valid Dates',
    success: blogDateIssues.length === 0,
    notes: blogDateIssues.length === 0
      ? `${blogPages.length} blog pages valid and <= ${freshnessWindowDays} days old`
      : `${blogDateIssues.length} date/freshness issue(s)`,
  },
  {
    name: 'Canonical and Robots Tags Exist Across Templates',
    success: Object.values(canonicalAndRobotsChecks).every(Boolean),
    notes: Object.entries(canonicalAndRobotsChecks).map(([k, v]) => `${k}:${v ? 'ok' : 'missing'}`).join(' | '),
  },
  {
    name: 'Sitemap Path Strategy Matches Content Pages',
    success: (sitemapPathsExpressionExists || sitemapEntriesExpressionExists) && noindexSitemapLeaks.length === 0,
    notes: (sitemapPathsExpressionExists || sitemapEntriesExpressionExists)
      ? `sitemap expression includes metadata-driven content page strategy (noindex leaks=${noindexSitemapLeaks.length})`
      : 'sitemap expression missing expected contentPages map strategy',
  },
  {
    name: 'llms.txt Includes Primary URL Hints',
    success: llmsHasPrimaryUrlsSection && llmsHasCorePaths,
    notes: `primary-urls-section=${llmsHasPrimaryUrlsSection} core-paths=${llmsHasCorePaths}`,
  },
];

const details = [
  `content pages detected: ${pages.length}`,
  `blog pages detected: ${blogPages.length}`,
  `freshness window: ${freshnessWindowDays} days`,
  `current date: ${now.toISOString().slice(0, 10)}`,
];

if (pagesMissingCoreMeta.length > 0) {
  details.push(`missing core metadata: ${pagesMissingCoreMeta.map((page) => page.path ?? '[unknown]').join(', ')}`);
}
if (pagesWithShortDescription.length > 0) {
  details.push(`short descriptions: ${pagesWithShortDescription.map((page) => page.path).join(', ')}`);
}
if (pagesWithLongTitle.length > 0) {
  details.push(`long titles: ${pagesWithLongTitle.map((page) => page.path).join(', ')}`);
}
if (blogDateIssues.length > 0) {
  details.push(`blog date issues: ${blogDateIssues.join(' | ')}`);
}
if (noindexSitemapLeaks.length > 0) {
  details.push(`noindex pages included in sitemap strategy: ${noindexSitemapLeaks.join(', ')}`);
}

const report = writeAgentReport({
  id: 'seo-content',
  title: 'SEO Content Agent Report',
  summary: 'Validates per-page metadata completeness, blog freshness, canonical/robots/noindex behavior, and sitemap/indexability consistency.',
  checks,
  details,
  mode,
  extra: {
    pages,
    blogDateIssues,
    canonicalAndRobotsChecks,
    sitemapPathsExpressionExists,
    sitemapEntriesExpressionExists,
    noindexPages,
    noindexSitemapLeaks,
  },
});

console.log('Report written: output/agent-reports/seo-content.md');
exitForStatus(report);
