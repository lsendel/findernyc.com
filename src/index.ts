import { Hono } from 'hono';
import { landingPageHtml } from './templates/landing';
import { contactPageHtml } from './templates/contact';
import { leadsRouter } from './routes/api/leads';
import { waitlistRouter } from './routes/api/waitlist';
import { analyticsRouter } from './routes/api/analytics';
import { configRouter } from './routes/api/config';
import { searchRouter } from './routes/api/search';
import { savedSearchesRouter } from './routes/api/saved-searches';
import { availabilityRouter } from './routes/api/availability';
import { fraudRouter } from './routes/api/fraud';
import { experimentsRouter } from './routes/api/experiments';
import { inquiriesRouter } from './routes/api/inquiries';
import { schedulingRouter } from './routes/api/scheduling';
import { aiRouter } from './routes/api/ai';
import { experienceRouter } from './routes/api/experience';
import { integrationsRouter } from './routes/api/integrations';
import { dashboardsRouter } from './routes/api/dashboards';
import { partnersRouter } from './routes/api/partners';
import {
  contentPageHtml,
  llmsTxt,
  robotsTxt,
  sitemapXml,
  SITE_NAME,
  SITE_URL,
  type ContentPage,
  type SitemapEntry,
} from './templates/content-page';

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
    SEARCH_RANKING_WEIGHTS_JSON?: string;
    SEARCH_BEHAVIORAL_BOOSTS_JSON?: string;
    EVENT_AVAILABILITY_JSON?: string;
    PRICE_SERVICE_FEE_RATE?: string;
    PRICE_TAX_RATE?: string;
    PRICE_MIN_SERVICE_FEE?: string;
    PRICE_ORGANIZER_FEE_PROFILES_JSON?: string;
    COMMUTE_BASE_BUFFER_MINUTES?: string;
    COMMUTE_BOROUGH_BASE_JSON?: string;
    NEIGHBORHOOD_FIT_WEIGHTS_JSON?: string;
    INVENTORY_WEBHOOK_TOKEN?: string;
    ALERT_EMAIL_WEBHOOK_URL?: string;
    ALERT_SMS_WEBHOOK_URL?: string;
    ALERT_PUSH_WEBHOOK_URL?: string;
    ALERT_EMAIL_ENDPOINT_URL?: string;
    ALERT_SMS_ENDPOINT_URL?: string;
    ALERT_PUSH_ENDPOINT_URL?: string;
    ALERT_EMAIL_PROVIDER_NAME?: string;
    ALERT_SMS_PROVIDER_NAME?: string;
    ALERT_PUSH_PROVIDER_NAME?: string;
    ALERT_EMAIL_WEBHOOK_AUTH_TOKEN?: string;
    ALERT_SMS_WEBHOOK_AUTH_TOKEN?: string;
    ALERT_PUSH_WEBHOOK_AUTH_TOKEN?: string;
    ALERT_FALLBACK_CHANNELS?: string;
    ALERT_EMAIL_FALLBACK_CHANNELS?: string;
    ALERT_SMS_FALLBACK_CHANNELS?: string;
    ALERT_PUSH_FALLBACK_CHANNELS?: string;
    ALERT_DELIVERY_SLO_MS?: string;
    ALERT_RETRY_SLO_ATTEMPTS?: string;
    ALERT_MAX_RETRIES?: string;
    ALERT_RETRY_BASE_MS?: string;
    SCHEDULING_GOOGLE_ENDPOINT_URL?: string;
    SCHEDULING_OUTLOOK_ENDPOINT_URL?: string;
    SCHEDULING_APPLE_ENDPOINT_URL?: string;
    SCHEDULING_GOOGLE_AUTH_TOKEN?: string;
    SCHEDULING_OUTLOOK_AUTH_TOKEN?: string;
    SCHEDULING_APPLE_AUTH_TOKEN?: string;
    SCHEDULING_BUSY_WINDOWS_JSON?: string;
    AI_MODEL_AVAILABLE?: string;
    AI_CONCIERGE_MODEL_VERSION?: string;
    AI_SHORTLIST_MODEL_VERSION?: string;
    AI_NEGOTIATION_MODEL_VERSION?: string;
    AI_DOCUMENT_HELPER_MODEL_VERSION?: string;
    AI_FOLLOW_UP_MODEL_VERSION?: string;
    AI_NEXT_BEST_ACTION_MODEL_VERSION?: string;
    AI_REVIEW_SAMPLE_RATE?: string;
    PARTNER_WEBHOOK_SECRET?: string;
    PARTNER_WEBHOOK_MAX_SKEW_SECONDS?: string;
    OPS_ACCESS_TOKEN?: string;
    WAITLIST_AUTOMATION_WEBHOOK_URL?: string;
    WAITLIST_AUTOMATION_WEBHOOK_AUTH_TOKEN?: string;
    WAITLIST_AUTOMATION_PROVIDER_NAME?: string;
  };
};

const app = new Hono<Env>();
const DEFAULT_PAGE_PUBLISHED_AT = '2026-02-27';
const DEFAULT_PAGE_UPDATED_AT = '2026-03-04';

const contentPages: ContentPage[] = [
  {
    path: '/about',
    title: 'About LocalGems | Local Event Discovery Platform',
    description: 'Learn how LocalGems helps people discover local events, hidden gems, and things to do near me in their own neighborhoods.',
    heading: 'About LocalGems',
    body: [
      'LocalGems helps urban communities discover local events and hidden gems that are easy to miss on large platforms.',
      'Our mission is to make local event discovery simple, trustworthy, and personalized for both residents and local businesses.',
      'We focus on surfacing events within walking distance, so people can do more in their own neighborhoods without endless searching.',
      'Business partners use LocalGems to publish accurate listings, grow attendance, and understand what programming resonates locally.',
    ],
    links: [
      { href: '/blog', label: 'Read local discovery guides' },
      { href: '/contact', label: 'Contact our team' },
    ],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About LocalGems',
      url: `${SITE_URL}/about`,
      isPartOf: SITE_URL,
    },
  },
  {
    path: '/blog',
    title: 'Local Event Discovery Blog | LocalGems',
    description: 'Read local event discovery insights, marketing tips for organizers, and neighborhood guides to hidden gems near you.',
    heading: 'Local Event Discovery Blog',
    highlights: [
      'Actionable guidance for ranking event pages in Google and LLM search.',
      'Practical examples you can use in weekly planning and campaign updates.',
      'Conversion-focused recommendations tied to real organizer workflows.',
    ],
    audience: ['Local Marketers', 'Event Organizers', 'Business Teams'],
    body: [
      'Our editorial team publishes practical guides to local events, neighborhood discovery patterns, and ranking strategies for event listings.',
      'You will find walkthroughs for both consumers searching for hidden gems and businesses trying to improve event visibility.',
      'Each article is designed to be useful for real planning decisions, from what to do near me this weekend to how to improve event conversion.',
    ],
    links: [
      { href: '/blog/local-event-discovery-guide', label: 'Local event discovery guide for residents' },
      { href: '/blog/google-event-seo-for-local-businesses', label: 'Google event SEO for local businesses' },
      { href: '/blog/llm-search-content-for-event-pages', label: 'LLM search content strategy for event pages' },
    ],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'LocalGems Blog',
      url: `${SITE_URL}/blog`,
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
  },
  {
    path: '/blog/local-event-discovery-guide',
    title: 'Local Event Discovery Guide: Find Hidden Gems Near You',
    description: 'A practical local event discovery guide to find hidden gems, weekend activities, and things to do near me without spammy feeds.',
    heading: 'Local Event Discovery Guide',
    body: [
      'Start with geography first: pick one neighborhood, then review events by walkability, start time, and crowd type.',
      'Use recurring event formats as anchors. Farmers markets, open mics, and community screenings often reveal the strongest local calendars.',
      'Track where information appears earliest. Small organizers usually publish on their own channels before mainstream platforms index listings.',
      'For better decision quality, compare three factors for every option: effort to attend, expected atmosphere, and whether you would invite a friend.',
      'If you keep a simple saved list by vibe, local event discovery becomes faster each week and hidden gems become easier to spot.',
    ],
    links: [
      { href: '/blog/google-event-seo-for-local-businesses', label: 'Next: Improve event SEO as a local business' },
      { href: '/contact', label: 'Ask for personalized recommendations' },
    ],
    answerBlocks: [
      {
        question: 'How do I quickly find hidden local events without wasting time?',
        answer: 'Start with one neighborhood, apply a strict walk-time filter, and save only events that match your preferred vibe and schedule window.',
      },
      {
        question: 'What is the highest-impact filter order for event discovery?',
        answer: 'Use geography first, then timing, then budget, then category. This sequence usually removes low-fit options fastest.',
      },
      {
        question: 'How can local discovery habits improve weekly planning?',
        answer: 'Reusing saved searches and event comparisons reduces decision time and helps you build a repeatable shortlist each week.',
      },
    ],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Local Event Discovery Guide',
      description: 'A practical local event discovery guide for hidden gems near you.',
      datePublished: '2026-02-27',
      dateModified: '2026-02-27',
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
      mainEntityOfPage: `${SITE_URL}/blog/local-event-discovery-guide`,
    },
  },
  {
    path: '/blog/google-event-seo-for-local-businesses',
    title: 'Google Event SEO for Local Businesses | LocalGems',
    description: 'Learn how local businesses can improve Google visibility for event pages with better structure, relevance, and conversion-focused copy.',
    heading: 'Google Event SEO for Local Businesses',
    body: [
      'Make every event page specific. Include neighborhood, event type, audience fit, start time, and a clear value promise in the first section.',
      'Add structured data and keep your metadata aligned with on-page copy so search engines can connect intent to actual page value.',
      'Avoid duplicate event pages with small wording changes. Consolidate similar pages and update canonical references consistently.',
      'Internal links matter: connect each event page to related guides, venue details, and category pages with descriptive anchor text.',
      'Track performance by query cluster, not just impressions. Focus on pages that attract high-intent traffic and convert to RSVPs.',
    ],
    links: [
      { href: '/analytics', label: 'Explore analytics add-ons' },
      { href: '/blog/llm-search-content-for-event-pages', label: 'Next: Optimize for LLM search' },
    ],
    answerBlocks: [
      {
        question: 'What should every local event page include for Google ranking?',
        answer: 'Include clear event intent, neighborhood, date and time, pricing, audience fit, and a direct conversion CTA near the top of the page.',
      },
      {
        question: 'How can I improve event SEO without publishing more pages?',
        answer: 'Consolidate duplicate pages, strengthen internal linking between related events, and keep metadata aligned with the visible page copy.',
      },
      {
        question: 'Which event SEO metric best predicts business value?',
        answer: 'Track query-cluster conversion to inquiries or bookings, not just impressions, because high-intent conversion reflects practical ranking quality.',
      },
    ],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'Google Event SEO for Local Businesses',
      description: 'How local businesses can improve event page visibility in Google.',
      datePublished: '2026-02-27',
      dateModified: '2026-02-27',
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
      mainEntityOfPage: `${SITE_URL}/blog/google-event-seo-for-local-businesses`,
    },
  },
  {
    path: '/blog/llm-search-content-for-event-pages',
    title: 'LLM Search Content Strategy for Event Pages | LocalGems',
    description: 'Build event pages that are easier for LLM search systems to retrieve, summarize, and recommend to local audiences.',
    heading: 'LLM Search Content Strategy for Event Pages',
    body: [
      'Write pages so answers are explicit. LLM retrieval works better when the page directly states who the event is for and why it matters.',
      'Use stable fields consistently: date, location, price, accessibility details, and booking link should appear in predictable positions.',
      'Support long-tail intent with concise Q&A blocks around parking, age limits, timing, and cancellation policies.',
      'Keep pages current. LLM systems tend to avoid stale content when fresher alternatives exist with clearer timestamps and revisions.',
      'Treat each page like a source document. If the page is specific, structured, and current, it is more likely to be cited or summarized accurately.',
    ],
    links: [
      { href: '/blog', label: 'Back to blog index' },
      { href: '/partnership', label: 'See partnership program' },
    ],
    answerBlocks: [
      {
        question: 'How do I format event content so LLM search can cite it accurately?',
        answer: 'Use explicit fields for date, location, price, accessibility details, and booking path in consistent positions on every event page.',
      },
      {
        question: 'What makes event pages easier for AI systems to summarize?',
        answer: 'Short direct answers, clear audience statements, and recent update timestamps improve retrieval confidence and summary quality.',
      },
      {
        question: 'How often should LLM-focused event pages be refreshed?',
        answer: 'Refresh whenever event details change and include visible updated dates so stale content is less likely to be selected.',
      },
    ],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: 'LLM Search Content Strategy for Event Pages',
      description: 'How to structure event pages for retrieval in LLM search.',
      datePublished: '2026-02-27',
      dateModified: '2026-02-27',
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME },
      mainEntityOfPage: `${SITE_URL}/blog/llm-search-content-for-event-pages`,
    },
  },
  {
    path: '/press',
    title: 'Press | LocalGems',
    description: 'Press resources, company overview, and media contact details for LocalGems and our local event discovery product.',
    heading: 'Press and Media',
    body: [
      'LocalGems is available for interviews, product briefings, and data commentary about local event discovery behavior.',
      'For media requests, use our contact page and include your outlet, timeline, and angle.',
      'We can provide market summaries on local event demand trends, neighborhood-level participation patterns, and organizer growth signals.',
    ],
    links: [
      { href: '/about', label: 'Company overview' },
      { href: '/contact', label: 'Media contact' },
    ],
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | LocalGems',
    description: 'Review the LocalGems privacy policy, including location usage, analytics data handling, and account data rights.',
    heading: 'Privacy Policy',
    body: [
      'LocalGems uses location and interaction data to improve local event discovery recommendations.',
      'We do not sell personal data and provide controls for consent, retention, and account-level data requests.',
      'You can request access, correction, or deletion of your information through our support channels.',
    ],
    links: [{ href: '/contact', label: 'Privacy requests and support' }],
  },
  {
    path: '/terms',
    title: 'Terms of Service | LocalGems',
    description: 'Read LocalGems terms of service for users, local businesses, subscriptions, billing terms, and acceptable use.',
    heading: 'Terms of Service',
    body: [
      'These terms explain how consumers and businesses can use LocalGems, including billing, cancellations, and feature access.',
      'By using our platform, you agree to follow these terms and all applicable local laws and policies.',
      'Business accounts are responsible for listing accuracy, schedule changes, and venue-specific requirements.',
    ],
    links: [{ href: '/cookies', label: 'Read cookie policy' }],
  },
  {
    path: '/cookies',
    title: 'Cookie Policy | LocalGems',
    description: 'Learn how LocalGems uses cookies for analytics, performance, and personalization in local event discovery experiences.',
    heading: 'Cookie Policy',
    body: [
      'Cookies help us measure performance, prevent abuse, and personalize local event recommendations.',
      'You can adjust cookie preferences through browser controls and consent settings where available.',
      'We use both essential and analytics cookies, and we document retention windows for each category.',
    ],
    links: [{ href: '/privacy', label: 'Back to privacy policy' }],
  },
  {
    path: '/analytics',
    title: 'Analytics Add-Ons | LocalGems',
    description: 'Explore LocalGems analytics add-ons for event organizers, including discovery insights, attribution, and attendance reporting.',
    heading: 'Analytics Add-Ons',
    highlights: [
      'Track discovery to inquiry conversion across neighborhood and category clusters.',
      'Prioritize ranking opportunities with high intent and low conversion coverage.',
      'Use event-level funnel data to decide what to optimize next.',
    ],
    audience: ['Marketing Teams', 'Venue Operators', 'Agency Partners'],
    primaryAction: {
      href: '/contact?use_case=marketing_analytics&team_size=small_2_10',
      label: 'Request Analytics Demo',
      description: 'Get a practical walkthrough focused on your growth and ranking goals.',
    },
    proofPoints: [
      {
        value: '+31%',
        label: 'Median inquiry rate lift',
        detail: 'Observed after top-query page cleanup and improved event intent matching.',
      },
      {
        value: '2.4x',
        label: 'Faster optimization loop',
        detail: 'Teams using funnel snapshots and weekly ranking diagnostics.',
      },
      {
        value: '-22%',
        label: 'Lower acquisition waste',
        detail: 'From reallocating spend away from low-intent query clusters.',
      },
      {
        value: '14 days',
        label: 'Typical first insight cycle',
        detail: 'Initial signal from discovery to inquiry conversion trends.',
      },
    ],
    body: [
      'Analytics add-ons provide organizers with visibility into impressions, saves, clicks, and conversion behavior.',
      'Plans are available for small venues through multi-location operators with flexible monthly pricing.',
      'Reporting modules include source attribution, neighborhood performance, and event-level funnel analytics.',
    ],
    links: [
      { href: '/contact', label: 'Request analytics demo' },
      { href: '/partnership', label: 'Evaluate partnership eligibility' },
    ],
  },
  {
    path: '/partnership',
    title: 'Event Coordinator Partnership Program | LocalGems',
    description: 'Details about the LocalGems Event Coordinator Partnership Program for agencies and multi-event teams.',
    heading: 'Event Coordinator Partnership Program',
    highlights: [
      'Coordinate multi-location event programs with shared rollout standards.',
      'Use partner tooling for campaign governance, QA, and reporting alignment.',
      'Support recurring calendars with a repeatable launch-to-optimization workflow.',
    ],
    audience: ['Agency Teams', 'Festival Operators', 'In-House Event Leads'],
    primaryAction: {
      href: '/contact?use_case=agency_partnership&team_size=mid_11_50',
      label: 'Apply for Partnership',
      description: 'Share your program scope and we will route you through partnership review.',
    },
    proofPoints: [
      {
        value: '3 weeks',
        label: 'Average onboarding timeline',
        detail: 'From eligibility review to first coordinated campaign launch.',
      },
      {
        value: '95%',
        label: 'Role-policy compliance',
        detail: 'Teams using standardized partner workspace templates.',
      },
      {
        value: '+27%',
        label: 'Recurring campaign efficiency',
        detail: 'Ops lift reported after adopting shared rollout playbooks.',
      },
      {
        value: '1 dashboard',
        label: 'Unified partner view',
        detail: 'Centralized cross-neighborhood insights for agency operators.',
      },
    ],
    body: [
      'The partnership program is designed for teams running high-volume local events across multiple neighborhoods.',
      'Participants receive strategy support, campaign tooling, and advanced reporting capabilities.',
      'Partnership tracks are available for agencies, festival operators, and in-house event teams with recurring calendars.',
    ],
    links: [
      { href: '/analytics', label: 'Compare analytics packages' },
      { href: '/contact', label: 'Apply for partnership review' },
    ],
  },
];

const contentPagesWithFreshness: ContentPage[] = contentPages.map((page) => ({
  ...page,
  publishedAt: page.publishedAt ?? DEFAULT_PAGE_PUBLISHED_AT,
  updatedAt: page.updatedAt ?? (page.path.startsWith('/blog') ? '2026-02-27' : DEFAULT_PAGE_UPDATED_AT),
}));

const sitemapEntries: SitemapEntry[] = [
  { path: '/', lastModified: DEFAULT_PAGE_UPDATED_AT },
  { path: '/contact', lastModified: DEFAULT_PAGE_UPDATED_AT },
  ...contentPagesWithFreshness.map((page) => ({
    path: page.path,
    lastModified: page.updatedAt,
  })),
];

app.get('/', (c) => c.html(landingPageHtml()));
app.get('/ops', (c) => {
  const requiredToken = c.env?.OPS_ACCESS_TOKEN?.trim();
  if (!requiredToken) {
    return c.text('Ops workspace is disabled. Set OPS_ACCESS_TOKEN to enable access.', 503);
  }

  const providedToken = c.req.query('token') ?? c.req.header('x-ops-token') ?? '';
  if (providedToken !== requiredToken) {
    return c.text('Unauthorized', 401);
  }

  return c.html(landingPageHtml({ opsMode: true }));
});
app.get('/contact', (c) => c.html(contactPageHtml()));
app.get('/favicon.ico', (c) => c.redirect('/images/placeholder.svg', 302));
app.get('/robots.txt', (c) => c.text(robotsTxt()));
app.get('/llms.txt', (c) => c.text(llmsTxt()));
app.get('/sitemap.xml', () =>
  new Response(sitemapXml(sitemapEntries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  }),
);

for (const page of contentPagesWithFreshness) {
  app.get(page.path, (c) => c.html(contentPageHtml(page)));
}

app.route('/api/leads', leadsRouter);
app.route('/api/waitlist', waitlistRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/config', configRouter);
app.route('/api/search', searchRouter);
app.route('/api/saved-searches', savedSearchesRouter);
app.route('/api/availability', availabilityRouter);
app.route('/api/fraud', fraudRouter);
app.route('/api/experiments', experimentsRouter);
app.route('/api/inquiries', inquiriesRouter);
app.route('/api/scheduling', schedulingRouter);
app.route('/api/ai', aiRouter);
app.route('/api/experience', experienceRouter);
app.route('/api/integrations', integrationsRouter);
app.route('/api/dashboards', dashboardsRouter);
app.route('/api/partners', partnersRouter);

app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: 'internal_error' }, 500);
});

export default app;
