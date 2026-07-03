import { Hono, type Context } from 'hono';
import { createFinderNycServices } from '../application/service-factory';
import {
  getGuidePageContent,
  getGuidesIndexContent,
  getLandingPageContent,
  getNeighborhoodsPageContent,
  getSpotPageContent,
} from '../application/content/use-cases';
import { buildAboutPage, buildPrivacyPage, buildTermsPage, buildTipsPage } from '../application/content/static-pages';
import { buildSearchPageModel } from '../application/discovery/use-cases';
import { isUnavailableD1Error } from '../lib/d1-errors';
import { landingPageHtml } from '../templates/landing';
import { spotPageHtml } from '../templates/spot';
import { searchPageHtml } from '../templates/search';
import {
  guidePageHtml,
  guidesIndexPageHtml,
  neighborhoodsPageHtml,
  simplePageHtml,
} from '../templates/content';
import type { SiteContext } from '../site/context';

type Env = { Bindings: { DB?: D1Database }; Variables: { site: SiteContext } };
type PagesContext = Context<Env>;

const pagesRouter = new Hono<Env>();

/* ------------------------------------------------------------------ */
/*  GET /  — Landing page                                              */
/* ------------------------------------------------------------------ */

pagesRouter.get('/', async (c) => {
  const db = c.env.DB;
  if (!db) {
    return c.html(landingPageHtml({ site: c.get('site') }));
  }

  try {
    const content = await getLandingPageContent(createFinderNycServices(db).content);

    return c.html(
      landingPageHtml({
        featuredSpots: content.featuredSpots,
        neighborhoods: content.neighborhoods,
        site: c.get('site'),
      }),
    );
  } catch (error) {
    if (isUnavailableD1Error(error)) {
      return c.html(landingPageHtml({ site: c.get('site') }));
    }
    throw error;
  }
});

/* ------------------------------------------------------------------ */
/*  GET /spots/:slug  — Spot detail page                               */
/* ------------------------------------------------------------------ */

pagesRouter.get('/spots/:slug', async (c) => {
  const db = c.env.DB;
  if (!db) return c.text('Spot not found', 404);
  const { slug } = c.req.param();
  try {
    const spot = await getSpotPageContent(createFinderNycServices(db).content, slug);

    if (!spot) return c.text('Spot not found', 404);
    return c.html(spotPageHtml({ ...spot, site: c.get('site') }));
  } catch (error) {
    if (isUnavailableD1Error(error)) {
      return c.text('Spot not found', 404);
    }
    throw error;
  }
});

async function renderSearchPage(c: PagesContext) {
  try {
    const db = c.env.DB;
    const searchInput = {
      query: c.req.query('q'),
      category: c.req.query('category'),
      borough: c.req.query('borough'),
      neighborhood: c.req.query('neighborhood'),
      sort: c.req.query('sort'),
    };

    const results = await buildSearchPageModel(
      db ? createFinderNycServices(db).discovery : null,
      searchInput,
    );
    return c.html(
      searchPageHtml({
        query: results.query,
        category: results.category,
        borough: results.borough,
        sort: results.sort,
        spots: results.spots,
        guides: results.guides,
        total: results.total,
        site: c.get('site'),
      }),
    );
  } catch (err) {
    if (isUnavailableD1Error(err)) {
      return c.html(
        searchPageHtml({
          query: c.req.query('q') ?? '',
          category: c.req.query('category') ?? '',
          borough: c.req.query('borough') ?? '',
          sort: c.req.query('sort') ?? 'relevance',
          spots: [],
          guides: [],
          total: 0,
          site: c.get('site'),
        }),
      );
    }
    console.error('Search page error:', err);
    return c.text(`Search error: ${err}`, 500);
  }
}

/* ------------------------------------------------------------------ */
/*  GET /hidden-gems and /search  — Search results page (SSR)          */
/* ------------------------------------------------------------------ */

pagesRouter.get('/hidden-gems', renderSearchPage);
pagesRouter.get('/search', renderSearchPage);

async function renderGuidesIndexPage(c: PagesContext) {
  const db = c.env.DB;
  if (!db) {
    return c.html(guidesIndexPageHtml([], c.get('site')));
  }

  try {
    return c.html(guidesIndexPageHtml(await getGuidesIndexContent(createFinderNycServices(db).content), c.get('site')));
  } catch (error) {
    if (isUnavailableD1Error(error)) {
      return c.html(guidesIndexPageHtml([], c.get('site')));
    }
    throw error;
  }
}

pagesRouter.get('/itineraries', renderGuidesIndexPage);
pagesRouter.get('/guides', renderGuidesIndexPage);

pagesRouter.get('/guides/:slug', async (c) => {
  const db = c.env.DB;
  if (!db) return c.text('Guide not found', 404);

  try {
    const guide = await getGuidePageContent(createFinderNycServices(db).content, c.req.param('slug'));
    if (!guide) return c.text('Guide not found', 404);
    return c.html(guidePageHtml(guide, c.get('site')));
  } catch (error) {
    if (isUnavailableD1Error(error)) {
      return c.text('Guide not found', 404);
    }
    throw error;
  }
});

pagesRouter.get('/neighborhoods', async (c) => {
  const db = c.env.DB;
  if (!db) {
    return c.html(neighborhoodsPageHtml([], c.get('site')));
  }

  try {
    return c.html(neighborhoodsPageHtml(await getNeighborhoodsPageContent(createFinderNycServices(db).content), c.get('site')));
  } catch (error) {
    if (isUnavailableD1Error(error)) {
      return c.html(neighborhoodsPageHtml([], c.get('site')));
    }
    throw error;
  }
});

pagesRouter.get('/about', (c) =>
  c.html(simplePageHtml({ ...buildAboutPage(c.get('site')), site: c.get('site') })),
);

pagesRouter.get('/privacy', (c) =>
  c.html(simplePageHtml({ ...buildPrivacyPage(c.get('site')), site: c.get('site') })),
);

pagesRouter.get('/terms', (c) =>
  c.html(simplePageHtml({ ...buildTermsPage(c.get('site')), site: c.get('site') })),
);

pagesRouter.get('/tips', (c) =>
  c.html(simplePageHtml({ ...buildTipsPage(c.get('site')), site: c.get('site') })),
);

export { pagesRouter };
