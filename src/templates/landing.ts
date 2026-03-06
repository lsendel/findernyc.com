import { SITE_NAME, SITE_URL, siteFontHeadHtml } from './content-page';

const faqEntries = [
  {
    question: 'How does the app find hyper-local events?',
    answer:
      'We partner directly with local organizers, venues, and businesses to ingest real-time event data. We also use location intelligence to surface events within walking distance of wherever you are — not just the big stuff everyone already knows about.',
  },
  {
    question: 'Is the app available in my city?',
    answer:
      "We're live in 500+ cities across the US and growing fast. Enter your zip code during sign-up and we'll tell you exactly what's available near you. If we're not in your city yet, you can join the waitlist and we'll notify you the moment we launch there.",
  },
  {
    question: 'How does the personalization work?',
    answer:
      'You start with a 2-minute Vibe Quiz that captures your interests, preferred event types, and neighborhood. From there, our algorithm learns from every event you save, attend, or skip — getting sharper every week until your feed feels like it was curated just for you.',
  },
  {
    question: "What's included in the free tier vs. premium?",
    answer:
      'The free Event Explorer tier gives you the Vibe Quiz, a daily feed of up to 10 local events, and the Event Map View. Local Insider ($49/month) unlocks unlimited events, Hidden Gem Alerts, advanced personalization, and an ad-free experience. Try it free for 30 days.',
  },
  {
    question: 'How do businesses get listed?',
    answer:
      "Sign up for any Business tier, create your profile, and start adding events. Your listings appear in the feeds of users who match your event's vibe and location. Most businesses see their first new customers within the first week of going live.",
  },
  {
    question: 'How do you handle my location and privacy?',
    answer:
      'We only access your location when the app is open and only to surface nearby events — we never sell your data to third parties. You can use the app with a manually entered zip code if you prefer not to share GPS location. Full details in our Privacy Policy.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      "You can cancel anytime from your account settings — no phone calls, no hoops to jump through. If you cancel before your billing date, you keep access until the end of the period. We also offer a 30-day money-back guarantee if you're not satisfied.",
  },
];

function jsonLdScript(payload: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(payload)}</script>`;
}

export function landingPageHtml(options?: { opsMode?: boolean }): string {
  const opsMode = options?.opsMode === true;
  const canonical = opsMode ? `${SITE_URL}/ops` : `${SITE_URL}/`;
  const ogImage = `${SITE_URL}/images/og-image.svg`;
  const robots = opsMode
    ? 'noindex,nofollow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
    : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Local event discovery platform for residents, marketers, and event operators.',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };

  const seoStructuredData = [websiteSchema, organizationSchema, faqSchema].map(jsonLdScript).join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Local Event Discovery — Find Hidden Gems Near You</title>
  <meta name="description" content="Discover local events and hidden gems near you. Find things to do near me with personalized local event discovery for urban professionals.">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en-US" href="${canonical}">
  <link rel="sitemap" type="application/xml" href="/sitemap.xml">
  <meta property="og:title" content="Local Event Discovery — Find Hidden Gems Near You">
  <meta property="og:description" content="Discover local events and hidden gems near you. Find things to do near me with personalized local event discovery.">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:locale" content="en_US">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Local Event Discovery — Find Hidden Gems Near You">
  <meta name="twitter:description" content="Discover local events and hidden gems near you with personalized local event discovery.">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="theme-color" content="#10243f">
  ${siteFontHeadHtml()}
  <link rel="icon" href="/images/placeholder.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/css/styles.css">
  ${seoStructuredData}
  <script src="/js/main.js" defer></script>
</head>
<body>
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <header class="site-header">
    <nav class="nav-desktop" aria-label="Desktop navigation">
      <a href="/" class="nav-logo" aria-label="Local Event Discovery home">
        <span class="logo-text">LocalGems</span>
      </a>
      <ul class="nav-links" role="list">
        <li><a href="#features" class="nav-link tap-target">Features</a></li>
        <li><a href="#how-it-works" class="nav-link tap-target">How It Works</a></li>
        <li><a href="#pricing" class="nav-link tap-target">Pricing</a></li>
        <li><a href="#pricing" class="nav-link tap-target">For Businesses</a></li>
      </ul>
      <a href="#sign-up" class="btn btn-primary tap-target" data-cta="get-started-nav" data-section="nav">Get Started Free</a>
    </nav>

    <nav class="nav-mobile" aria-label="Mobile navigation">
      <a href="/" class="nav-logo" aria-label="Local Event Discovery home">
        <span class="logo-text">LocalGems</span>
      </a>
      <div class="nav-mobile-actions">
        <a href="#sign-up" class="btn btn-primary btn-sm tap-target" data-cta="get-started-nav" data-section="nav">Get Started Free</a>
        <button
          class="hamburger tap-target"
          aria-label="Open navigation menu"
          aria-expanded="false"
          aria-controls="mobile-drawer"
          id="hamburger-btn"
          type="button"
        >
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>
    </nav>

    <div class="mobile-drawer" id="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation menu" hidden>
      <div class="mobile-drawer-overlay" id="drawer-overlay"></div>
      <div class="mobile-drawer-content">
        <button
          class="drawer-close tap-target"
          aria-label="Close navigation menu"
          id="drawer-close-btn"
          type="button"
        >
          <span aria-hidden="true">&times;</span>
        </button>
        <ul class="drawer-nav-links" role="list">
          <li><a href="#features" class="drawer-nav-link tap-target">Features</a></li>
          <li><a href="#how-it-works" class="drawer-nav-link tap-target">How It Works</a></li>
          <li><a href="#pricing" class="drawer-nav-link tap-target">Pricing</a></li>
          <li><a href="#pricing" class="drawer-nav-link tap-target">For Businesses</a></li>
          <li>
            <a href="#sign-up" class="btn btn-primary tap-target drawer-cta" data-cta="get-started-nav" data-section="nav">Get Started Free</a>
          </li>
        </ul>
      </div>
    </div>
  </header>

  <main id="main-content">
    <section id="hero" data-section="hero">
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <h1>Discover Hidden Local Gems Right in Your City</h1>
            <p class="hero-subheadline">For urban professionals who feel like they're missing out — we surface the real events your city is hiding from you.</p>
            <div class="hero-ctas">
              <a href="#sign-up" class="btn btn-primary btn-lg tap-target" data-cta="find-events-hero" data-section="hero">Find Events Near Me — It's Free</a>
              <a href="#pricing" class="btn btn-secondary tap-target" data-cta="business-hero" data-section="hero">I'm a local business →</a>
            </div>
            <p class="hero-social-proof">Built for local residents, marketers, and event operators who need reliable local discovery workflows.</p>
          </div>
          <div class="hero-visual">
            <img src="/images/hero-scene.svg" alt="Outdoor market event scene with mobile app UI overlay showing local event cards" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
          </div>
        </div>
      </div>
    </section>

    <section id="persona-paths" data-section="persona-paths">
      <div class="container">
        <h2 class="section-headline">Choose Your Primary Workflow</h2>
        <p class="section-subheadline">Start with the path that best matches your day-to-day goals, then we tune the rest of the product around it.</p>
        <div class="persona-path-grid">
          <article class="persona-path-card">
            <p class="persona-path-kicker">For Residents</p>
            <h3>Discover Hidden Local Events</h3>
            <p>Find things to do near you with faster shortlist decisions and fewer low-fit results.</p>
            <ul class="persona-path-list">
              <li>Run Smart Search with local filters</li>
              <li>Save alerts for weekly plans</li>
              <li>Move from search to inquiry in one flow</li>
            </ul>
            <a href="/contact?use_case=consumer_discovery" class="btn btn-outline tap-target">Start Discovery Path</a>
          </article>
          <article class="persona-path-card">
            <p class="persona-path-kicker">For Marketers</p>
            <h3>Improve Ranking And Conversion</h3>
            <p>Focus on high-intent query clusters, funnel gaps, and practical next actions each week.</p>
            <ul class="persona-path-list">
              <li>Track CTR, inquiry rate, and schedule rate</li>
              <li>Prioritize low-coverage high-intent clusters</li>
              <li>Launch marketing consult intake with defaults</li>
            </ul>
            <a href="/contact?use_case=marketing_analytics&team_size=small_2_10" class="btn btn-outline tap-target">Start Marketing Path</a>
          </article>
          <article class="persona-path-card">
            <p class="persona-path-kicker">For Operators</p>
            <h3>Scale Listings And Partnerships</h3>
            <p>Route high-volume programs into repeatable onboarding, governance, and partnership workflows.</p>
            <ul class="persona-path-list">
              <li>Use structured intake and routing previews</li>
              <li>Activate partnership review tracks by default</li>
              <li>Coordinate growth plans across teams</li>
            </ul>
            <a href="/contact?use_case=agency_partnership&team_size=mid_11_50" class="btn btn-outline tap-target">Start Operator Path</a>
          </article>
        </div>
      </div>
    </section>

    <section id="smart-search" data-section="smart-search" hidden>
      <div class="container">
        <h2 class="section-headline">Try Smart Search for Local Events</h2>
        <p id="smart-search-subheadline" class="section-subheadline">Type what you want in plain language, then refine by borough or category.</p>
        ${opsMode ? '<p class="smart-search-inquiry-caption">Ops workspace: advanced controls are available in this route by default.</p>' : ''}
        <div class="smart-search-journey" aria-label="Search workflow">
          <span class="smart-search-journey-step">1. Search</span>
          <span class="smart-search-journey-step">2. Start Inquiry</span>
          <span class="smart-search-journey-step">3. Schedule Hold</span>
        </div>
        <div class="smart-search-quick-start" aria-label="Quick start searches">
          <p class="smart-search-quick-start-caption">Quick start templates</p>
          <div class="smart-search-quick-start-actions">
            <button
              type="button"
              class="btn btn-outline tap-target smart-search-template-btn"
              data-smart-query-template="free live music tonight"
              data-smart-template-borough="brooklyn"
              data-smart-template-category="music"
              data-cta="smart-search-template-music"
              data-section="smart-search"
            >
              Free Live Music Tonight
            </button>
            <button
              type="button"
              class="btn btn-outline tap-target smart-search-template-btn"
              data-smart-query-template="family friendly events this weekend"
              data-smart-template-category="family"
              data-cta="smart-search-template-family"
              data-section="smart-search"
            >
              Family Weekend Picks
            </button>
            <button
              type="button"
              class="btn btn-outline tap-target smart-search-template-btn"
              data-smart-query-template="networking events after work"
              data-smart-template-category="networking"
              data-smart-template-starts-before-hour="21"
              data-cta="smart-search-template-networking"
              data-section="smart-search"
            >
              After-Work Networking
            </button>
            <button
              type="button"
              id="smart-search-run-last"
              class="btn btn-outline tap-target smart-search-last-btn"
              data-cta="smart-search-run-last"
              data-section="smart-search"
              disabled
            >
              Run Last Search
            </button>
          </div>
          <ul id="smart-search-recent-queries" class="smart-search-recent-queries" aria-live="polite"></ul>
        </div>
        <section id="smart-search-experience-panel" class="smart-search-experience-panel" hidden>
          <div class="smart-search-experience-grid">
            <label class="smart-search-field">
              <span id="smart-search-language-label">Language</span>
              <select id="smart-search-language-select" name="language_select">
                <option value="en-US">English (US)</option>
                <option value="es-US">Espanol (US)</option>
                <option value="zh-CN">Chinese (Simplified)</option>
              </select>
            </label>
            <div id="smart-search-accessibility-panel" class="smart-search-accessibility-panel" hidden>
              <p class="smart-search-inquiry-caption">Accessibility-first mode</p>
              <label class="smart-search-toggle">
                <input id="smart-search-a11y-high-contrast" type="checkbox">
                <span>High contrast</span>
              </label>
              <label class="smart-search-toggle">
                <input id="smart-search-a11y-reduced-motion" type="checkbox">
                <span>Reduced motion</span>
              </label>
              <label class="smart-search-toggle">
                <input id="smart-search-a11y-keyboard-first" type="checkbox">
                <span>Keyboard-first flow</span>
              </label>
            </div>
          </div>
        </section>
        <form id="smart-search-form" class="smart-search-form" novalidate>
          <label id="smart-search-query-label" for="smart-search-query">What are you looking for?</label>
          <input
            id="smart-search-query"
            name="query"
            type="search"
            required
            placeholder="Example: free jazz in brooklyn tonight"
          >
          <div class="smart-search-controls">
            <label class="smart-search-field">
              <span id="smart-search-borough-label">Borough</span>
              <select id="smart-search-borough" name="borough">
                <option value="">Any borough</option>
                <option value="manhattan">Manhattan</option>
                <option value="brooklyn">Brooklyn</option>
                <option value="queens">Queens</option>
                <option value="bronx">Bronx</option>
                <option value="staten_island">Staten Island</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span id="smart-search-category-label">Category</span>
              <select id="smart-search-category" name="category">
                <option value="">Any category</option>
                <option value="music">Music</option>
                <option value="food">Food</option>
                <option value="arts">Arts</option>
                <option value="networking">Networking</option>
                <option value="family">Family</option>
                <option value="wellness">Wellness</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span id="smart-search-max-price-label">Max Price (USD)</span>
              <input id="smart-search-max-price" name="max_price" type="number" min="0" step="1" placeholder="Any price">
            </label>
            <details class="smart-search-more-filters">
              <summary>More filters for timing, commute, and vibe</summary>
              <div class="smart-search-more-filters-grid">
                <label class="smart-search-field">
                  <span id="smart-search-starts-before-label">Starts Before (Hour)</span>
                  <input id="smart-search-starts-before-hour" name="starts_before_hour" type="number" min="0" max="23" step="1" placeholder="Any time">
                </label>
                <label class="smart-search-field">
                  <span id="smart-search-walk-distance-label">Walk Distance (Minutes)</span>
                  <input id="smart-search-within-walk-minutes" name="within_walk_minutes" type="number" min="1" max="120" step="1" placeholder="Any walk time">
                </label>
                <label class="smart-search-field">
                  <span>Home Borough (for commute)</span>
                  <select id="smart-search-home-borough" name="home_borough">
                    <option value="">Not set</option>
                    <option value="manhattan">Manhattan</option>
                    <option value="brooklyn">Brooklyn</option>
                    <option value="queens">Queens</option>
                    <option value="bronx">Bronx</option>
                    <option value="staten_island">Staten Island</option>
                  </select>
                </label>
                <label class="smart-search-field">
                  <span>Work Borough (for commute)</span>
                  <select id="smart-search-work-borough" name="work_borough">
                    <option value="">Not set</option>
                    <option value="manhattan">Manhattan</option>
                    <option value="brooklyn">Brooklyn</option>
                    <option value="queens">Queens</option>
                    <option value="bronx">Bronx</option>
                    <option value="staten_island">Staten Island</option>
                  </select>
                </label>
                <label class="smart-search-field">
                  <span>Commute Anchor</span>
                  <select id="smart-search-commute-anchor" name="profile_anchor">
                    <option value="balanced">Balanced</option>
                    <option value="home">From home</option>
                    <option value="work">From work</option>
                  </select>
                </label>
                <label class="smart-search-field">
                  <span>Neighborhood Vibe</span>
                  <select id="smart-search-neighborhood-vibe" name="preferred_vibes">
                    <option value="">Any vibe</option>
                    <option value="creative">Creative</option>
                    <option value="family">Family</option>
                    <option value="foodie">Foodie</option>
                    <option value="professional">Professional</option>
                    <option value="quiet">Quiet</option>
                    <option value="nightlife">Nightlife</option>
                    <option value="wellness">Wellness</option>
                  </select>
                </label>
                <label class="smart-search-field">
                  <span>Crowd Preference</span>
                  <select id="smart-search-neighborhood-crowd" name="crowd_tolerance">
                    <option value="">Any crowd</option>
                    <option value="low">Low-key</option>
                    <option value="medium">Balanced</option>
                    <option value="high">Energetic</option>
                  </select>
                </label>
                <label class="smart-search-field">
                  <span>Budget Preference</span>
                  <select id="smart-search-neighborhood-budget" name="budget_preference">
                    <option value="">Any budget</option>
                    <option value="free">Free-first</option>
                    <option value="value">Value</option>
                    <option value="premium">Premium</option>
                  </select>
                </label>
              </div>
            </details>
            <button
              id="smart-search-submit"
              class="btn btn-primary tap-target"
              type="submit"
              data-cta="smart-search-submit"
              data-section="smart-search"
            >
              Search Events
            </button>
          </div>
        </form>
        <div id="smart-search-filter-builder" class="smart-search-filter-builder" hidden>
          <div class="smart-search-filter-chip-row">
            <strong>Active Filters</strong>
            <div id="smart-search-filter-chip-list" class="smart-search-filter-chip-list" aria-live="polite"></div>
            <button id="smart-search-clear-filters" type="button" class="btn btn-outline tap-target">Clear Filters</button>
          </div>
          <div class="smart-search-filter-presets-row">
            <input
              id="smart-search-preset-name"
              type="text"
              maxlength="30"
              placeholder="Preset name (optional)"
              aria-label="Preset name"
            >
            <button id="smart-search-save-preset" type="button" class="btn btn-outline tap-target">Save Preset</button>
          </div>
          <ul id="smart-search-filter-presets" class="smart-search-filter-presets" aria-live="polite"></ul>
        </div>
        <section id="smart-search-inquiry-profile" class="smart-search-inquiry-profile" hidden>
          <h3>One-Click Inquiry Profile</h3>
          <p class="smart-search-inquiry-caption">Saved once, auto-filled for every inquiry request.</p>
          <div class="smart-search-inquiry-grid">
            <label class="smart-search-field">
              <span>Full Name</span>
              <input id="smart-search-profile-name" name="profile_name" type="text" autocomplete="name" placeholder="Your name">
            </label>
            <label class="smart-search-field">
              <span>Email</span>
              <input id="smart-search-profile-email" name="profile_email" type="email" autocomplete="email" placeholder="you@example.com">
            </label>
            <label class="smart-search-field">
              <span>Phone (optional)</span>
              <input id="smart-search-profile-phone" name="profile_phone" type="tel" autocomplete="tel" placeholder="+1 212 555 0100">
            </label>
            <label class="smart-search-field">
              <span>Preferred Contact</span>
              <select id="smart-search-profile-channel" name="profile_channel">
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone</option>
              </select>
            </label>
            <label class="smart-search-field smart-search-field-full">
              <span>Inquiry Note (optional)</span>
              <input id="smart-search-profile-note" name="profile_note" type="text" maxlength="400" placeholder="Questions or availability details">
            </label>
          </div>
        </section>
        <section id="smart-search-scheduling-panel" class="smart-search-scheduling-panel" hidden>
          <h3>In-App Scheduling</h3>
          <p class="smart-search-inquiry-caption">Pick defaults for calendar sync when scheduling from a search result.</p>
          <div class="smart-search-scheduling-grid">
            <label class="smart-search-field">
              <span>Calendar Provider</span>
              <select id="smart-search-calendar-provider" name="calendar_provider">
                <option value="google_calendar">Google Calendar</option>
                <option value="outlook_calendar">Outlook Calendar</option>
                <option value="apple_calendar">Apple Calendar</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Date</span>
              <input id="smart-search-schedule-date" name="schedule_date" type="date">
            </label>
            <label class="smart-search-field">
              <span>Start Time</span>
              <input id="smart-search-schedule-time" name="schedule_time" type="time" value="18:00">
            </label>
          </div>
          <label class="smart-search-toggle">
            <input id="smart-search-auto-schedule" type="checkbox" checked>
            <span>Auto-schedule after inquiry using these defaults</span>
          </label>
        </section>
        <section id="smart-search-ai-panel" class="smart-search-ai-panel" hidden>
          <h3>AI Concierge + Shortlist Builder</h3>
          <p class="smart-search-inquiry-caption">Grounded suggestions from current event catalog with safe-response guardrails.</p>
          <div class="smart-search-ai-grid">
            <div class="smart-search-ai-card">
              <label class="smart-search-field">
                <span>Concierge Prompt</span>
                <input id="smart-search-ai-concierge-query" type="text" placeholder="Example: suggest low-cost networking in manhattan">
              </label>
              <button id="smart-search-ai-concierge-submit" type="button" class="btn btn-outline tap-target">Ask Concierge</button>
              <p id="smart-search-ai-concierge-status" class="smart-search-result-meta" aria-live="polite"></p>
              <p id="smart-search-ai-concierge-answer" class="smart-search-result-desc"></p>
              <ul id="smart-search-ai-concierge-citations" class="saved-searches-list" aria-live="polite"></ul>
            </div>
            <div class="smart-search-ai-card">
              <label class="smart-search-field">
                <span>Shortlist Intent</span>
                <input id="smart-search-ai-shortlist-intent" type="text" placeholder="Example: creative date night under 30 dollars">
              </label>
              <button id="smart-search-ai-shortlist-submit" type="button" class="btn btn-outline tap-target">Build Shortlist</button>
              <p id="smart-search-ai-shortlist-status" class="smart-search-result-meta" aria-live="polite"></p>
              <ul id="smart-search-ai-shortlist-results" class="saved-searches-list" aria-live="polite"></ul>
            </div>
            <div class="smart-search-ai-card">
              <label class="smart-search-field">
                <span>Negotiation Goals</span>
                <input id="smart-search-ai-negotiation-goals" type="text" placeholder="Example: lower fees, flexible cancellation, written terms">
              </label>
              <button id="smart-search-ai-negotiation-submit" type="button" class="btn btn-outline tap-target">Generate Negotiation Prep</button>
              <p id="smart-search-ai-negotiation-status" class="smart-search-result-meta" aria-live="polite"></p>
              <ul id="smart-search-ai-negotiation-points" class="saved-searches-list" aria-live="polite"></ul>
              <p id="smart-search-ai-negotiation-script" class="smart-search-result-desc"></p>
            </div>
            <div class="smart-search-ai-card">
              <label class="smart-search-field">
                <span>Listing Document Text</span>
                <textarea id="smart-search-ai-document-text" rows="5" placeholder="Paste listing terms, agreement excerpt, or organizer document text"></textarea>
              </label>
              <button id="smart-search-ai-document-submit" type="button" class="btn btn-outline tap-target">Analyze Document</button>
              <p id="smart-search-ai-document-status" class="smart-search-result-meta" aria-live="polite"></p>
              <p id="smart-search-ai-document-summary" class="smart-search-result-desc"></p>
              <ul id="smart-search-ai-document-checklist" class="saved-searches-list" aria-live="polite"></ul>
            </div>
            <div class="smart-search-ai-card">
              <label class="smart-search-field">
                <span>Follow-Up Recipient</span>
                <input id="smart-search-ai-followup-recipient" type="text" placeholder="Example: user@example.com">
              </label>
              <label class="smart-search-field">
                <span>Follow-Up Template</span>
                <select id="smart-search-ai-followup-template">
                  <option value="post_shortlist_check_in">Post-shortlist check-in</option>
                  <option value="price_drop_nudge">Price-drop nudge</option>
                  <option value="deadline_reminder">Deadline reminder</option>
                </select>
              </label>
              <button id="smart-search-ai-followup-approve" type="button" class="btn btn-outline tap-target">Approve Template</button>
              <button id="smart-search-ai-followup-submit" type="button" class="btn btn-outline tap-target">Run Follow-Up</button>
              <p id="smart-search-ai-followup-status" class="smart-search-result-meta" aria-live="polite"></p>
              <p id="smart-search-ai-followup-message" class="smart-search-result-desc"></p>
            </div>
            <div class="smart-search-ai-card">
              <label class="smart-search-field">
                <span>Suppression Recipient</span>
                <input id="smart-search-ai-suppression-recipient" type="text" placeholder="Example: user@example.com">
              </label>
              <div class="dashboard-manager-grid">
                <label class="smart-search-field">
                  <span>Quiet Hours Start</span>
                  <input id="smart-search-ai-suppression-quiet-start" type="number" min="0" max="23" step="1" value="22">
                </label>
                <label class="smart-search-field">
                  <span>Quiet Hours End</span>
                  <input id="smart-search-ai-suppression-quiet-end" type="number" min="0" max="23" step="1" value="8">
                </label>
                <label class="smart-search-field">
                  <span>Frequency Cap / Day</span>
                  <input id="smart-search-ai-suppression-cap" type="number" min="1" max="20" step="1" value="3">
                </label>
                <label class="smart-search-field">
                  <span>Opt-Out</span>
                  <input id="smart-search-ai-suppression-opt-out" type="checkbox">
                </label>
              </div>
              <div class="dashboard-manager-actions">
                <button id="smart-search-ai-suppression-load" type="button" class="btn btn-outline tap-target">Load Suppression Controls</button>
                <button id="smart-search-ai-suppression-save" type="button" class="btn btn-outline tap-target">Save Suppression Controls</button>
                <button id="smart-search-ai-dispatches-refresh" type="button" class="btn btn-outline tap-target">Refresh Dispatches</button>
              </div>
              <p id="smart-search-ai-suppression-status" class="smart-search-result-meta" aria-live="polite"></p>
              <ul id="smart-search-ai-dispatches" class="saved-searches-list" aria-live="polite"></ul>
            </div>
            <div class="smart-search-ai-card">
              <label class="smart-search-field">
                <span>Next Best Action Stage</span>
                <select id="smart-search-ai-nba-stage">
                  <option value="discovery">Discovery</option>
                  <option value="consideration">Consideration</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="ready_to_book">Ready to book</option>
                  <option value="post_inquiry">Post inquiry</option>
                </select>
              </label>
              <button id="smart-search-ai-nba-submit" type="button" class="btn btn-outline tap-target">Generate Next Best Actions</button>
              <p id="smart-search-ai-nba-status" class="smart-search-result-meta" aria-live="polite"></p>
              <ul id="smart-search-ai-nba-actions" class="saved-searches-list" aria-live="polite"></ul>
            </div>
          </div>
        </section>
        <div class="smart-search-advanced-toggle-row">
          <label class="smart-search-toggle">
            <input id="smart-search-show-advanced" type="checkbox">
            <span>Show advanced operator controls</span>
          </label>
        </div>
        <details id="smart-search-advanced-details" class="smart-search-advanced-details" hidden>
          <summary>Operations Console (Advanced)</summary>
          <p class="smart-search-inquiry-caption">Power tools for QA, fraud operations, integrations, and partner administration.</p>
        <section id="ai-review-sampling-panel" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>AI Review Sampling Queue</h3>
          <p class="fraud-ops-caption">Review sampled AI outputs and mark approved or needs revision.</p>
          <div class="dashboard-manager-grid">
            <label class="smart-search-field">
              <span>Filter</span>
              <select id="ai-review-status-filter">
                <option value="pending">Pending</option>
                <option value="all">All</option>
                <option value="approved">Approved</option>
                <option value="needs_revision">Needs revision</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Reviewer</span>
              <input id="ai-review-reviewer" type="text" value="ops_ai_reviewer" placeholder="reviewer id">
            </label>
            <label class="smart-search-field">
              <span>Decision Notes</span>
              <input id="ai-review-notes" type="text" value="manual quality review" placeholder="review notes">
            </label>
          </div>
          <div class="dashboard-manager-actions">
            <button id="ai-review-refresh" type="button" class="btn btn-outline tap-target">Refresh AI Queue</button>
          </div>
          <p id="ai-review-status" class="smart-search-result-meta" aria-live="polite"></p>
          <ul id="ai-review-list" class="saved-searches-list" aria-live="polite"></ul>
        </section>
        <p id="smart-search-status" class="smart-search-status" role="status" aria-live="polite"></p>
        <section id="smart-search-compare-panel" class="smart-search-compare-panel" hidden aria-live="polite">
          <h3>Compare Events</h3>
          <p id="smart-search-compare-summary" class="smart-search-compare-summary"></p>
          <div id="smart-search-compare-grid" class="smart-search-compare-grid"></div>
        </section>
        <section id="availability-sync-panel" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>Realtime Availability Sync</h3>
          <p class="fraud-ops-caption">Push seat/status updates through sync or provider-webhook paths.</p>
          <div class="dashboard-manager-grid">
            <label class="smart-search-field">
              <span>Event ID</span>
              <input id="availability-sync-event-id" type="text" value="evt_001" placeholder="event id">
            </label>
            <label class="smart-search-field">
              <span>Status (optional)</span>
              <select id="availability-sync-status">
                <option value="">Derive from seat counts</option>
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="sold_out">Sold out</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Seats Total</span>
              <input id="availability-sync-seats-total" type="number" min="1" step="1" value="120">
            </label>
            <label class="smart-search-field">
              <span>Seats Remaining</span>
              <input id="availability-sync-seats-remaining" type="number" min="0" step="1" value="12">
            </label>
            <label class="smart-search-field">
              <span>Webhook Provider</span>
              <input id="availability-sync-provider" type="text" value="provider-a" placeholder="provider id">
            </label>
            <label class="smart-search-field">
              <span>Webhook Token</span>
              <input
                id="availability-sync-token"
                type="text"
                value="inventory-token"
                placeholder="inventory token"
                autocomplete="off"
                spellcheck="false"
              >
            </label>
          </div>
          <div class="dashboard-manager-actions">
            <button id="availability-sync-submit" type="button" class="btn btn-outline tap-target">Run Sync</button>
            <button id="availability-webhook-submit" type="button" class="btn btn-outline tap-target">Run Webhook</button>
          </div>
          <p id="availability-sync-status-text" class="smart-search-result-meta" aria-live="polite"></p>
          <div id="availability-sync-response" class="fraud-ops-metrics"></div>
        </section>
        <section id="fraud-ops-dashboard" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>Operator Fraud Review Dashboard</h3>
          <p class="fraud-ops-caption">Track review queue volume, outcomes, and false-positive trends.</p>
          <div id="fraud-ops-metrics" class="fraud-ops-metrics"></div>
          <button id="fraud-ops-refresh" type="button" class="btn btn-outline tap-target">Refresh Dashboard</button>
        </section>
        <section id="fraud-review-queue-panel" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>Fraud Review Queue</h3>
          <p class="fraud-ops-caption">Review flagged events and apply operator decisions.</p>
          <div class="dashboard-manager-grid">
            <label class="smart-search-field">
              <span>Queue Status</span>
              <select id="fraud-review-status-filter">
                <option value="pending">Pending</option>
                <option value="all">All</option>
                <option value="cleared">Cleared</option>
                <option value="confirmed_fraud">Confirmed fraud</option>
                <option value="false_positive">False positive</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Limit</span>
              <input id="fraud-review-limit" type="number" min="1" max="25" step="1" value="5">
            </label>
            <label class="smart-search-field">
              <span>Reviewer</span>
              <input id="fraud-review-reviewer" type="text" value="ops_reviewer" placeholder="reviewer id">
            </label>
            <label class="smart-search-field">
              <span>Notes</span>
              <input id="fraud-review-notes" type="text" value="manual verification run" placeholder="decision notes">
            </label>
          </div>
          <div class="dashboard-manager-actions">
            <button id="fraud-review-refresh" type="button" class="btn btn-outline tap-target">Refresh Queue</button>
          </div>
          <p id="fraud-review-status" class="smart-search-result-meta" aria-live="polite"></p>
          <ul id="fraud-review-list" class="saved-searches-list" aria-live="polite"></ul>
        </section>
        <section id="insights-hub-panel" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>Insights Hub</h3>
          <p class="fraud-ops-caption">Trend summaries and conversion funnel snapshots.</p>
          <div id="insights-hub-summary" class="fraud-ops-metrics"></div>
          <button id="insights-hub-refresh" type="button" class="btn btn-outline tap-target">Refresh Insights</button>
        </section>
        <section id="user-dashboards-panel" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>User Dashboards</h3>
          <p class="fraud-ops-caption">Create and manage owner-specific KPI cards.</p>
          <div class="dashboard-manager-grid">
            <label class="smart-search-field">
              <span>Owner ID</span>
              <input id="user-dashboards-owner-id" type="text" value="local-ops" placeholder="owner id">
            </label>
            <label class="smart-search-field">
              <span>Dashboard Name</span>
              <input id="user-dashboards-name" type="text" value="Smart Search Performance" placeholder="Dashboard name">
            </label>
            <label class="smart-search-field">
              <span>Primary Metric</span>
              <select id="user-dashboards-metric">
                <option value="search_queries">Search Queries</option>
                <option value="search_clicks">Search Clicks</option>
                <option value="inquiries_submitted">Inquiries Submitted</option>
                <option value="schedules_confirmed">Schedules Confirmed</option>
                <option value="ai_conversions">AI Conversions</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Visualization</span>
              <select id="user-dashboards-visualization">
                <option value="kpi">KPI</option>
                <option value="line">Line</option>
                <option value="bar">Bar</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Window (days)</span>
              <input id="user-dashboards-window-days" type="number" min="1" max="90" step="1" value="14">
            </label>
          </div>
          <div class="dashboard-manager-actions">
            <button id="user-dashboards-save" type="button" class="btn btn-outline tap-target">Save Dashboard</button>
            <button id="user-dashboards-refresh" type="button" class="btn btn-outline tap-target">Refresh Dashboards</button>
          </div>
          <p id="user-dashboards-status" class="smart-search-result-meta" aria-live="polite"></p>
          <ul id="user-dashboards-list" class="saved-searches-list" aria-live="polite"></ul>
        </section>
        <section id="experimentation-panel" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>Experiment Controls</h3>
          <p class="fraud-ops-caption">Review experiment guardrails and trigger controlled rollback.</p>
          <div id="experimentation-summary" class="fraud-ops-metrics"></div>
          <div class="dashboard-manager-grid">
            <label class="smart-search-field">
              <span>Experiment</span>
              <select id="experimentation-id">
                <option value="ranking_blend_v1">Ranking Blend v1</option>
                <option value="trust_controls_v1">Trust Controls v1</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Rollback Reason</span>
              <input id="experimentation-rollback-reason" type="text" value="manual_safety_override" placeholder="rollback reason">
            </label>
          </div>
          <div class="dashboard-manager-actions">
            <button id="experimentation-refresh" type="button" class="btn btn-outline tap-target">Refresh Experiments</button>
            <button id="experimentation-rollback" type="button" class="btn btn-outline tap-target">Rollback Experiment</button>
          </div>
          <p id="experimentation-status" class="smart-search-result-meta" aria-live="polite"></p>
        </section>
        <section id="webhook-ops-panel" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>API Webhook Access</h3>
          <p class="fraud-ops-caption">Send signed partner webhook events and verify auth/signing/replay behavior.</p>
          <div class="dashboard-manager-grid">
            <label class="smart-search-field">
              <span>Partner ID</span>
              <input id="webhook-ops-partner-id" type="text" value="partner-a" placeholder="partner id">
            </label>
            <label class="smart-search-field">
              <span>Shared Secret</span>
              <input
                id="webhook-ops-shared-secret"
                type="text"
                value="top-secret"
                placeholder="shared secret"
                autocomplete="off"
                spellcheck="false"
              >
            </label>
            <label class="smart-search-field">
              <span>Event ID</span>
              <input id="webhook-ops-event-id" type="text" value="evt_smoke_001" placeholder="event id">
            </label>
            <label class="smart-search-field">
              <span>Event Type</span>
              <input id="webhook-ops-event-type" type="text" value="booking.created" placeholder="event type">
            </label>
            <label class="smart-search-field">
              <span>Timestamp (ms)</span>
              <input id="webhook-ops-timestamp" type="text" placeholder="auto-generated">
            </label>
            <label class="smart-search-field">
              <span>Nonce</span>
              <input id="webhook-ops-nonce" type="text" placeholder="auto-generated">
            </label>
            <label class="smart-search-field webhook-ops-payload-field">
              <span>Payload JSON</span>
              <textarea id="webhook-ops-payload" rows="4" placeholder='{"booking_id":"bk_smoke_001","amount":120}'>{"booking_id":"bk_smoke_001","amount":120}</textarea>
            </label>
          </div>
          <div class="dashboard-manager-actions">
            <button id="webhook-ops-send" type="button" class="btn btn-outline tap-target">Send Signed Webhook</button>
            <button id="webhook-ops-reset" type="button" class="btn btn-outline tap-target">Reset Defaults</button>
          </div>
          <p id="webhook-ops-status" class="smart-search-result-meta" aria-live="polite"></p>
          <div id="webhook-ops-response" class="fraud-ops-metrics"></div>
        </section>
        <section id="partner-ops-panel" class="fraud-ops-dashboard" hidden aria-live="polite">
          <h3>Partner Workspace Ops</h3>
          <p class="fraud-ops-caption">Role templates, white-label tenant config, and rollout phase tracking.</p>
          <div class="dashboard-manager-grid">
            <label class="smart-search-field">
              <span>Workspace ID</span>
              <input id="partner-ops-workspace-id" type="text" value="pilot_workspace" placeholder="workspace id">
            </label>
            <label class="smart-search-field">
              <span>Member ID</span>
              <input id="partner-ops-member-id" type="text" value="agent.partner" placeholder="member id">
            </label>
            <label class="smart-search-field">
              <span>Role</span>
              <select id="partner-ops-role-id">
                <option value="workspace_admin">Workspace Admin</option>
                <option value="ops_manager">Ops Manager</option>
                <option value="analyst">Analyst</option>
                <option value="support_agent">Support Agent</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Assigned By (optional)</span>
              <input id="partner-ops-assigned-by" type="text" value="ops_lead" placeholder="assigned by">
            </label>
            <label class="smart-search-field">
              <span>Tenant ID</span>
              <input id="partner-ops-tenant-id" type="text" value="pilot_workspace" placeholder="tenant id">
            </label>
            <label class="smart-search-field">
              <span>Brand Name</span>
              <input id="partner-ops-brand-name" type="text" value="LocalGems Partner Portal" placeholder="brand name">
            </label>
            <label class="smart-search-field">
              <span>Primary Color</span>
              <input id="partner-ops-primary-color" type="text" value="#10324a" placeholder="#10324a">
            </label>
            <label class="smart-search-field">
              <span>Accent Color</span>
              <input id="partner-ops-accent-color" type="text" value="#f4b400" placeholder="#f4b400">
            </label>
            <label class="smart-search-field">
              <span>Logo URL (optional)</span>
              <input id="partner-ops-logo-url" type="text" placeholder="https://example.com/logo.svg">
            </label>
            <label class="smart-search-field webhook-ops-payload-field">
              <span>Feature Overrides JSON</span>
              <textarea id="partner-ops-feature-overrides" rows="4" placeholder='{"ai_concierge_chat":true}'>{}</textarea>
            </label>
            <label class="smart-search-field">
              <span>Rollout Phase</span>
              <select id="partner-ops-phase">
                <option value="sandbox_validation">Sandbox validation</option>
                <option value="staging_dry_run">Staging dry run</option>
                <option value="limited_production">Limited production</option>
                <option value="general_availability">General availability</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Phase Status</span>
              <select id="partner-ops-phase-status">
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>
          <div class="dashboard-manager-actions">
            <button id="partner-ops-refresh" type="button" class="btn btn-outline tap-target">Refresh Partner Ops</button>
            <button id="partner-ops-assign-role" type="button" class="btn btn-outline tap-target">Assign Role</button>
            <button id="partner-ops-load-portal" type="button" class="btn btn-outline tap-target">Load Portal Config</button>
            <button id="partner-ops-save-portal" type="button" class="btn btn-outline tap-target">Save Portal Config</button>
            <button id="partner-ops-update-phase" type="button" class="btn btn-outline tap-target">Update Rollout Phase</button>
          </div>
          <p id="partner-ops-status" class="smart-search-result-meta" aria-live="polite"></p>
          <div id="partner-ops-summary" class="fraud-ops-metrics"></div>
          <ul id="partner-ops-assignments" class="saved-searches-list" aria-live="polite"></ul>
          <div id="partner-ops-portal-config" class="fraud-ops-metrics"></div>
        </section>
        </details>
        <div class="smart-search-results-header">
          <h3>Results and Next Actions</h3>
          <p class="smart-search-inquiry-caption">Use event cards to save alerts, start one-click inquiries, and schedule without leaving search.</p>
        </div>
        <ul id="smart-search-results" class="smart-search-results" aria-live="polite"></ul>
        <div id="saved-searches-panel" class="saved-searches-panel" hidden>
          <h3>Saved Search Alerts</h3>
          <p class="saved-searches-caption">You will be alerted when new events match these searches.</p>
          <ul id="saved-searches-list" class="saved-searches-list" aria-live="polite"></ul>
          <p id="saved-search-alert-ops-status" class="smart-search-result-meta" aria-live="polite"></p>
          <ul id="saved-search-alert-attempts" class="saved-searches-list" aria-live="polite"></ul>
        </div>
      </div>
    </section>

    <section id="trust" data-section="trust">
      <div class="container">
        <div class="trust-grid">
          <article class="trust-item">
            <strong>Metadata freshness governance</strong>
            <span>Published and updated dates are explicit across public routes.</span>
          </article>
          <article class="trust-item">
            <strong>Schema + SEO integrity checks</strong>
            <span>Structured data and canonical tags are validated in automated tests.</span>
          </article>
          <article class="trust-item">
            <strong>Intake routing parity</strong>
            <span>Landing and contact follow the same follow-up decision policy.</span>
          </article>
          <article class="trust-item">
            <strong>Accessibility quality gates</strong>
            <span>Screen-reader and a11y smoke checks run with every quality pass.</span>
          </article>
          <article class="trust-item">
            <strong>Weekly KPI cluster reports</strong>
            <span>Opportunity scoring and funnel deltas are generated by default.</span>
          </article>
          <article class="trust-item">
            <strong>Fail-closed ops controls</strong>
            <span>Advanced operations surfaces require explicit authenticated access.</span>
          </article>
        </div>
      </div>
    </section>

    <section id="pain" data-section="pain">
      <div class="container">
        <h2 class="section-headline">Finding cool things to do in your city is broken</h2>
        <div class="pain-grid">
          <div class="pain-block">
            <img src="/images/spam-icon.svg" alt="Spam icon representing social media noise" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <strong>Endless Scroll, Zero Signal</strong>
            <p class="pain-desc">You scroll through Instagram and Facebook for an hour. All you find are promoted concerts and sponsored ads — nothing that feels real or local.</p>
          </div>
          <div class="pain-block">
            <img src="/images/stadium-icon.svg" alt="Stadium icon representing large corporate events" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <strong>Big Venues, Boring Choices</strong>
            <p class="pain-desc">Eventbrite and Ticketmaster only show you stadium shows and corporate mixers. The intimate rooftop sessions and pop-up markets? Invisible.</p>
          </div>
          <div class="pain-block">
            <img src="/images/speech-icon.svg" alt="Speech bubble icon representing late word-of-mouth" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <strong>You Heard About It Monday</strong>
            <p class="pain-desc">Your friend texts you about an amazing Sunday market — on Monday. Word-of-mouth is great, but it always arrives too late to actually go.</p>
          </div>
        </div>
        <figure class="pain-comparison">
          <img src="/images/pain-comparison.svg" alt="Side-by-side comparison: what you see on social media vs what's actually happening nearby" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
        </figure>
      </div>
    </section>

    <section id="solution" data-section="solution">
      <div class="container">
        <h2 class="section-headline">Meet your neighborhood scout for hidden local gems</h2>
        <p class="solution-value-prop">We combine your location, your vibe preferences, and real-time data from local organizers to surface events within walking distance that you actually want to attend — before they sell out or pass you by.</p>
        <div class="solution-layout">
          <div class="solution-benefits">
            <p class="benefit-statement">Hyper-local discovery — events within a 10-minute walk from you</p>
            <p class="benefit-statement">Smarter every week — recommendations that learn your taste over time</p>
            <p class="benefit-statement">Truly hidden gems — events you won't find on any other platform</p>
            <a href="#sign-up" class="btn btn-primary tap-target" data-cta="start-discovering-solution" data-section="solution">Start Discovering Free</a>
          </div>
          <div class="solution-visual">
            <img src="/images/solution-demo.svg" alt="App event feed showing hyper-local events with vibe tags and distances" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
          </div>
        </div>
      </div>
    </section>

    <section id="how-it-works" data-section="how-it-works">
      <div class="container">
        <h2 class="section-headline">Get started in 3 easy steps</h2>
        <div class="steps-grid">
          <div class="step">
            <div class="step-number">1</div>
            <h3>Take the 2-Minute Vibe Quiz</h3>
            <p>Answer a few quick questions about your interests and neighborhood. We use your answers to build a personalized event feed just for you.</p>
          </div>
          <div class="steps-connector" aria-hidden="true"></div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>See What's Happening Near You</h3>
            <p>Your feed updates daily with hyper-local events matched to your vibe — from jazz nights to pop-up markets, all within reach.</p>
          </div>
          <div class="steps-connector" aria-hidden="true"></div>
          <div class="step">
            <div class="step-number">3</div>
            <h3>Go Do Something Amazing</h3>
            <p>Get directions, save events to your calendar, and share with friends. Your city has been hiding these gems — now you'll never miss them.</p>
          </div>
        </div>
        <div class="how-it-works-cta">
          <a href="#sign-up" class="btn btn-primary tap-target" data-cta="take-quiz-how-it-works" data-section="how-it-works">Take the Free Quiz</a>
        </div>
      </div>
    </section>

    <section id="features" data-section="features">
      <div class="container">
        <h2 class="section-headline">Everything you need to never miss out again</h2>
        <div class="features-grid">
          <div class="feature-block">
            <img src="/images/radar.svg" alt="Radar icon for hyper-local event detection" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <h3>Hyper-Local Radar</h3>
            <p>See events happening within a 10-minute walk. No more driving across town for something that wasn't worth it.</p>
          </div>
          <div class="feature-block">
            <img src="/images/vibe.svg" alt="Vibe matching icon for personalized recommendations" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <h3>Vibe Matching</h3>
            <p>Tell us your vibe once. We learn your taste over time and serve up events you'll actually love, not just tolerate.</p>
          </div>
          <div class="feature-block">
            <img src="/images/gem.svg" alt="Hidden gem icon for under-the-radar event alerts" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <h3>Hidden Gem Alerts</h3>
            <p>Get push notifications for under-the-radar events before they fill up — the ones your friends will be jealous you went to.</p>
          </div>
          <div class="feature-block">
            <img src="/images/save.svg" alt="Bookmark icon for saving and sharing events" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <h3>Save &amp; Share</h3>
            <p>Bookmark events with one tap and share them directly to your group chat. Planning a night out has never been this easy.</p>
          </div>
          <div class="feature-block">
            <img src="/images/map.svg" alt="Map pin icon for visual event map view" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <h3>Event Map View</h3>
            <p>Switch to map mode and see every event near you plotted in real time. Spot clusters, pick your neighborhood, go explore.</p>
          </div>
          <div class="feature-block">
            <img src="/images/spotlight.svg" alt="Spotlight icon for verified local business events" loading="lazy" onerror="this.src='/images/placeholder.svg'; this.onerror=null;">
            <h3>Business Spotlights</h3>
            <p>Discover verified events from local businesses — with accurate details, real photos, and direct links to book or RSVP.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="social-proof" data-section="social-proof">
      <div class="container">
        <h2 class="section-headline">Operational outcomes from active workflow teams</h2>
        <p class="aggregate-rating">Measured from rolling telemetry and structured onboarding follow-up activity.</p>
        <div class="testimonials-grid">
          <div class="testimonial">
            <span class="testimonial-name">Discovery Teams</span>
            <span class="testimonial-city">Resident workflow</span>
            <span class="testimonial-stars">Search to shortlist</span>
            <blockquote>Teams use Smart Search filters, quick templates, and one-click inquiry to cut repetitive browsing, shortlist relevant options faster, and move from discovery to action in a single session.</blockquote>
          </div>
          <div class="testimonial">
            <span class="testimonial-name">Marketing Teams</span>
            <span class="testimonial-city">Ranking workflow</span>
            <span class="testimonial-stars">Cluster optimization</span>
            <blockquote>Marketers review query-cluster opportunities each week, prioritize high-intent coverage gaps, test stronger page intent, and use guided recommendations to improve CTR and inquiry conversion.</blockquote>
          </div>
          <div class="testimonial">
            <span class="testimonial-name">Operator Teams</span>
            <span class="testimonial-city">Partnership workflow</span>
            <span class="testimonial-stars">Repeatable rollout</span>
            <blockquote>Operators rely on structured intake routing, default automation settings, and phase-based controls to reduce manual handoffs, keep partner onboarding predictable, and maintain rollout accountability.</blockquote>
          </div>
        </div>
        <div class="business-case-study">
          <p class="business-name">Execution principle</p>
          <p class="result-stat">Ship measurable improvements weekly</p>
          <blockquote>Every UI and funnel update ties to an explicit metric: discovery quality, inquiry conversion, schedule completion, or follow-up reliability.</blockquote>
        </div>
      </div>
    </section>

    <section id="marketing-snapshot" data-section="marketing-snapshot">
      <div class="container">
        <div class="marketing-snapshot-header">
          <h2 class="section-headline">Marketing Snapshot</h2>
          <p class="section-subheadline">Live acquisition and conversion signals to guide ranking strategy this week.</p>
          <button id="marketing-snapshot-refresh" type="button" class="btn btn-outline tap-target">Refresh Snapshot</button>
        </div>
        <div class="marketing-snapshot-grid">
          <article class="marketing-snapshot-card">
            <p class="marketing-snapshot-label">Search CTR</p>
            <p id="marketing-snapshot-ctr" class="marketing-snapshot-value">--</p>
            <p class="marketing-snapshot-note">Click-through from search impressions to event-card clicks.</p>
          </article>
          <article class="marketing-snapshot-card">
            <p class="marketing-snapshot-label">Inquiry Rate</p>
            <p id="marketing-snapshot-inquiry-rate" class="marketing-snapshot-value">--</p>
            <p class="marketing-snapshot-note">Share of engaged visitors starting contact or booking intent.</p>
          </article>
          <article class="marketing-snapshot-card">
            <p class="marketing-snapshot-label">Schedule Rate</p>
            <p id="marketing-snapshot-schedule-rate" class="marketing-snapshot-value">--</p>
            <p class="marketing-snapshot-note">Confirmed schedules from inquiries in the active window.</p>
          </article>
          <article class="marketing-snapshot-card">
            <p class="marketing-snapshot-label">Ranking Opportunity</p>
            <p id="marketing-snapshot-ranking-opportunity" class="marketing-snapshot-value">--</p>
            <p id="marketing-snapshot-window" class="marketing-snapshot-note">Window: --</p>
          </article>
        </div>
        <div class="marketing-snapshot-list-block">
          <h3>Top Query Clusters</h3>
          <ul id="marketing-snapshot-top-events" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading metrics...</li>
          </ul>
          <h3>Recommended Next Actions</h3>
          <ul id="marketing-snapshot-actions" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading recommendations...</li>
          </ul>
          <h3>Funnel Friction Alerts</h3>
          <ul id="marketing-snapshot-alerts" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading funnel alerts...</li>
          </ul>
          <h3>Recommended Automations</h3>
          <ul id="marketing-snapshot-automations" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading automation defaults...</li>
          </ul>
          <h3>Automation Tuning Rules</h3>
          <ul id="marketing-snapshot-tuning-rules" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading automation tuning rules...</li>
          </ul>
          <h3>Automation Execution State</h3>
          <ul id="marketing-snapshot-automation-state" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading auto-run diagnostics...</li>
          </ul>
          <h3>Weekly Execution Playbook</h3>
          <ul id="marketing-snapshot-playbook" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading weekly execution playbook...</li>
          </ul>
          <p id="marketing-snapshot-playbook-progress" class="smart-search-result-meta" aria-live="polite">Playbook progress: --</p>
          <h3>Outcome Recovery Actions</h3>
          <ul id="marketing-snapshot-playbook-recovery" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading outcome recovery actions...</li>
          </ul>
          <h3>Recovery Impact &amp; Escalation</h3>
          <ul id="marketing-snapshot-recovery-impact" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading recovery impact and escalation actions...</li>
          </ul>
          <a id="marketing-snapshot-open-intake" class="btn btn-outline tap-target" href="/contact" hidden>Open Prefilled Intake Plan</a>
          <div class="marketing-snapshot-actions-note">
            <label class="onboarding-toggle">
              <input id="marketing-snapshot-auto-run-top" type="checkbox" checked>
              <span>Auto-run top opportunity query after refresh when search input is empty</span>
            </label>
            <label class="onboarding-toggle">
              <input id="marketing-snapshot-auto-run-recovery" type="checkbox" checked>
              <span>Auto-run highest-priority recovery query when outcome confidence is medium or high</span>
            </label>
            <label class="onboarding-toggle">
              <input id="marketing-snapshot-auto-run-escalation" type="checkbox" checked>
              <span>Auto-run highest-priority escalation query only when recovery confidence is high and at least two recovery runs have completed</span>
            </label>
            <label class="onboarding-toggle">
              <span>Escalation auto-run cooldown window</span>
              <select id="marketing-snapshot-escalation-cooldown-hours" class="tap-target">
                <option value="6">6 hours</option>
                <option value="12">12 hours</option>
                <option value="24" selected>24 hours</option>
                <option value="48">48 hours</option>
              </select>
            </label>
            <label class="onboarding-toggle">
              <input id="marketing-snapshot-auto-apply-recommended" type="checkbox" checked>
              <span>Auto-apply recommended automation defaults for this session</span>
            </label>
            <div class="dashboard-manager-actions">
              <button id="marketing-snapshot-pause-auto-run-6h" type="button" class="btn btn-outline tap-target">Pause Auto-Runs (6h)</button>
              <button id="marketing-snapshot-pause-auto-run-24h" type="button" class="btn btn-outline tap-target">Pause Auto-Runs (24h)</button>
              <button id="marketing-snapshot-resume-auto-run" type="button" class="btn btn-outline tap-target">Resume Auto-Runs</button>
            </div>
            <div class="dashboard-manager-actions">
              <button id="marketing-snapshot-run-next-auto-action" type="button" class="btn btn-outline tap-target">Run Next Auto Action</button>
              <button id="marketing-snapshot-clear-query-retry-auto" type="button" class="btn btn-outline tap-target">Clear Query &amp; Retry Auto-Runs</button>
              <button id="marketing-snapshot-apply-tuning-rules-now" type="button" class="btn btn-outline tap-target">Apply Tuning Rules Now</button>
            </div>
            <p id="marketing-snapshot-auto-run-pause-state" class="smart-search-result-meta" aria-live="polite">Auto-runs active.</p>
          </div>
          <h3>Waitlist Flow Funnel</h3>
          <ul id="marketing-snapshot-waitlist-funnel" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading waitlist funnel...</li>
          </ul>
          <p id="marketing-snapshot-status" class="smart-search-result-meta" aria-live="polite"></p>
        </div>
      </div>
    </section>

    <section id="pricing" data-section="pricing">
      <div class="container">
        <h2 class="section-headline">Simple pricing. No surprises. Cancel anytime.</h2>
        <div class="pricing-tabs">
          <button class="pricing-tab-btn is-active" data-tab="consumer" data-cta="pricing-tab-consumer" data-section="pricing">For Consumers</button>
          <button class="pricing-tab-btn" data-tab="business" data-cta="pricing-tab-business" data-section="pricing">For Businesses</button>
        </div>

        <div class="pricing-sub-section" id="pricing-consumer">
          <div class="pricing-cards">
            <div class="pricing-card">
              <h3>Event Explorer</h3>
              <p class="pricing-price">Free</p>
              <ul class="pricing-features">
                <li>Vibe Quiz</li>
                <li>Basic feed (up to 10 events/day)</li>
                <li>Event Map View</li>
                <li>Save up to 5 events</li>
                <li>Community ratings</li>
              </ul>
              <a href="#sign-up" class="btn btn-outline tap-target" data-cta="get-started-free-pricing" data-section="pricing">Get Started Free</a>
            </div>
            <div class="pricing-card is-featured">
              <h3>Local Insider</h3>
              <span class="badge-popular">Most Popular</span>
              <p class="pricing-price">$49<span>/month</span></p>
              <ul class="pricing-features">
                <li>Everything in Explorer</li>
                <li>Unlimited feed</li>
                <li>Hidden Gem Alerts</li>
                <li>Advanced Vibe Matching</li>
                <li>Unlimited Save &amp; Share</li>
                <li>Early waitlist access</li>
                <li>Ad-free</li>
                <li>Priority support</li>
              </ul>
              <a href="#sign-up" class="btn btn-primary tap-target" data-cta="start-free-trial-pricing" data-section="pricing">Start Free Trial</a>
            </div>
          </div>
          <p class="pricing-risk-reversal">No credit card required for free tier · 30-day money-back guarantee on Local Insider</p>
        </div>

        <div class="pricing-sub-section" id="pricing-business" hidden>
          <div class="pricing-cards pricing-cards--business">
            <div class="pricing-card">
              <h3>Starter</h3>
              <p class="pricing-price">$50<span>/month</span></p>
              <ul class="pricing-features">
                <li>1 listing</li>
                <li>Up to 5 events/month</li>
                <li>Basic analytics</li>
              </ul>
              <a href="#sign-up" class="btn btn-outline tap-target" data-cta="get-listed-starter" data-section="pricing">Get Listed</a>
            </div>
            <div class="pricing-card is-featured">
              <h3>Growth</h3>
              <span class="badge-popular">Most Popular</span>
              <p class="pricing-price">$100<span>/month</span></p>
              <ul class="pricing-features">
                <li>Up to 3 listings</li>
                <li>Unlimited events</li>
                <li>Business Spotlight</li>
                <li>Advanced analytics</li>
                <li>Priority placement</li>
              </ul>
              <a href="#sign-up" class="btn btn-primary tap-target" data-cta="get-listed-growth" data-section="pricing">Get Listed</a>
            </div>
            <div class="pricing-card">
              <h3>Pro</h3>
              <p class="pricing-price">$200<span>/month</span></p>
              <ul class="pricing-features">
                <li>Up to 10 listings</li>
                <li>Everything in Growth</li>
                <li>Featured homepage placement</li>
                <li>Dedicated account manager</li>
                <li>Custom campaigns</li>
              </ul>
              <a href="#sign-up" class="btn btn-outline tap-target" data-cta="get-listed-pro" data-section="pricing">Get Listed</a>
            </div>
          </div>
          <p class="pricing-risk-reversal">Cancel anytime · No long-term contracts · 30-day free trial</p>
        </div>

        <p class="pricing-addon-note">Need deeper insights? Community Insight &amp; Analytics Add-Ons from $25–$150/month. Running large-scale events? Ask about our Event Coordinator Partnership Program ($10,000/year).</p>

        <noscript>
          <style>#pricing-business { display: block !important; }</style>
        </noscript>
      </div>
    </section>

    <section id="faq" data-section="faq">
      <div class="container">
        <h2 class="section-headline">Got questions? We've got answers.</h2>
        <div class="faq-list">
          <details class="faq-item">
            <summary><h3>How does the app find hyper-local events?</h3></summary>
            <div class="faq-answer">We partner directly with local organizers, venues, and businesses to ingest real-time event data. We also use location intelligence to surface events within walking distance of wherever you are — not just the big stuff everyone already knows about.</div>
          </details>
          <details class="faq-item">
            <summary><h3>Is the app available in my city?</h3></summary>
            <div class="faq-answer">We're live in 500+ cities across the US and growing fast. Enter your zip code during sign-up and we'll tell you exactly what's available near you. If we're not in your city yet, you can join the waitlist and we'll notify you the moment we launch there.</div>
          </details>
          <details class="faq-item">
            <summary><h3>How does the personalization work?</h3></summary>
            <div class="faq-answer">You start with a 2-minute Vibe Quiz that captures your interests, preferred event types, and neighborhood. From there, our algorithm learns from every event you save, attend, or skip — getting sharper every week until your feed feels like it was curated just for you.</div>
          </details>
          <details class="faq-item">
            <summary><h3>What's included in the free tier vs. premium?</h3></summary>
            <div class="faq-answer">The free Event Explorer tier gives you the Vibe Quiz, a daily feed of up to 10 local events, and the Event Map View. Local Insider ($49/month) unlocks unlimited events, Hidden Gem Alerts, advanced personalization, and an ad-free experience. Try it free for 30 days.</div>
          </details>
          <details class="faq-item">
            <summary><h3>How do businesses get listed?</h3></summary>
            <div class="faq-answer">Sign up for any Business tier, create your profile, and start adding events. Your listings appear in the feeds of users who match your event's vibe and location. Most businesses see their first new customers within the first week of going live.</div>
          </details>
          <details class="faq-item">
            <summary><h3>How do you handle my location and privacy?</h3></summary>
            <div class="faq-answer">We only access your location when the app is open and only to surface nearby events — we never sell your data to third parties. You can use the app with a manually entered zip code if you prefer not to share GPS location. Full details in our Privacy Policy.</div>
          </details>
          <details class="faq-item">
            <summary><h3>How do I cancel my subscription?</h3></summary>
            <div class="faq-answer">You can cancel anytime from your account settings — no phone calls, no hoops to jump through. If you cancel before your billing date, you keep access until the end of the period. We also offer a 30-day money-back guarantee if you're not satisfied.</div>
          </details>
        </div>
        <p class="faq-support-line">Still have questions? <a href="/contact">Chat with us →</a></p>
      </div>
    </section>

    <section id="sign-up" data-section="sign-up">
      <div class="container">
        <h2 class="section-headline">Start your free local event discovery journey</h2>
        <p class="sign-up-copy">Join our waitlist to get early access to hyper-local hidden gems, personalized recommendations, and business event promotion tools.</p>
        <section id="onboarding-assistant" class="onboarding-assistant" aria-label="First-run setup">
          <h3>30-Second Setup Assistant</h3>
          <p class="smart-search-inquiry-caption">Pick your role once and we will auto-configure search and plan defaults.</p>
          <div class="onboarding-role-grid" role="group" aria-label="Role selection">
            <button type="button" class="btn btn-outline tap-target onboarding-role-btn" data-onboarding-role="consumer">I Discover Events</button>
            <button type="button" class="btn btn-outline tap-target onboarding-role-btn" data-onboarding-role="marketer">I Run Marketing</button>
            <button type="button" class="btn btn-outline tap-target onboarding-role-btn" data-onboarding-role="business">I Manage Listings</button>
          </div>
          <div class="onboarding-input-grid">
            <label class="smart-search-field">
              <span>City (optional)</span>
              <input id="onboarding-city" type="text" autocomplete="address-level2" placeholder="New York">
            </label>
            <label class="smart-search-field">
              <span>Primary Borough (optional)</span>
              <select id="onboarding-borough">
                <option value="">Not set</option>
                <option value="manhattan">Manhattan</option>
                <option value="brooklyn">Brooklyn</option>
                <option value="queens">Queens</option>
                <option value="bronx">Bronx</option>
                <option value="staten_island">Staten Island</option>
              </select>
            </label>
            <label class="smart-search-field">
              <span>Team Size (optional)</span>
              <select id="onboarding-team-size">
                <option value="">Not set</option>
                <option value="solo">Solo</option>
                <option value="small_2_10">2-10</option>
                <option value="mid_11_50">11-50</option>
                <option value="enterprise_50_plus">50+</option>
              </select>
            </label>
          </div>
          <div class="onboarding-actions">
            <button id="onboarding-apply-defaults" type="button" class="btn btn-primary tap-target" data-cta="onboarding-apply-defaults" data-section="sign-up">Apply Defaults</button>
            <a href="#smart-search" class="btn btn-outline tap-target" data-cta="onboarding-jump-search" data-section="sign-up">Go To Smart Search</a>
          </div>
          <p class="smart-search-result-meta">Quick packs: select a role to auto-apply defaults and run Smart Search instantly.</p>
          <div class="onboarding-preferences">
            <label class="onboarding-toggle">
              <input id="onboarding-instant-apply" type="checkbox" checked>
              <span>Instant role setup (apply defaults when selecting a role)</span>
            </label>
            <label class="onboarding-toggle">
              <input id="onboarding-auto-alert" type="checkbox" checked>
              <span>Auto-create a saved alert from these defaults</span>
            </label>
            <label class="onboarding-toggle">
              <input id="onboarding-autofill-lead" type="checkbox" checked>
              <span>Use setup profile to prefill waitlist and contact forms</span>
            </label>
          </div>
          <p id="onboarding-status" class="contact-status" role="status" aria-live="polite"></p>
        </section>
        <section id="journey-progress" class="journey-progress" aria-label="Setup journey progress">
          <h3>Setup Journey</h3>
          <p class="smart-search-result-meta">Track completion of the core happy path and continue where you left off.</p>
          <ul id="journey-progress-list" class="saved-searches-list" aria-live="polite">
            <li class="saved-search-item">Loading journey status...</li>
          </ul>
          <a id="journey-progress-cta" class="btn btn-outline tap-target" href="#sign-up" hidden>Continue setup</a>
        </section>
        <form id="lead-capture-form" class="sign-up-form" novalidate>
          <label for="lead-email">Email address</label>
          <div class="sign-up-form-row">
            <input id="lead-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com">
            <button id="lead-submit-button" class="btn btn-primary tap-target" type="submit">Join the Waitlist</button>
          </div>
          <div class="sign-up-context-grid">
            <label class="smart-search-field" for="lead-use-case">
              <span>Use Case</span>
              <select id="lead-use-case" name="use_case">
                <option value="">Not specified</option>
                <option value="consumer_discovery">Discover local events</option>
                <option value="marketing_analytics">Marketing analytics and ranking insights</option>
                <option value="business_listing">Business listings and promotion</option>
                <option value="agency_partnership">Agency or partnership program</option>
              </select>
            </label>
            <label class="smart-search-field" for="lead-team-size">
              <span>Team Size</span>
              <select id="lead-team-size" name="team_size">
                <option value="">Not specified</option>
                <option value="solo">Solo</option>
                <option value="small_2_10">2-10</option>
                <option value="mid_11_50">11-50</option>
                <option value="enterprise_50_plus">50+</option>
              </select>
            </label>
            <label class="smart-search-field" for="lead-city">
              <span>City (optional)</span>
              <input id="lead-city" name="city" type="text" autocomplete="address-level2" placeholder="New York">
            </label>
          </div>
          <p id="lead-route-preview" class="smart-search-result-meta"></p>
          <p id="lead-profile-summary" class="smart-search-result-meta"></p>
          <p id="lead-capture-status" class="contact-status" role="status" aria-live="polite"></p>
          <a id="lead-next-action" class="btn btn-outline tap-target" href="/contact" hidden>Continue to next step</a>
        </form>
        <div class="sign-up-actions">
          <a href="/contact" class="btn btn-outline tap-target" data-cta="advanced-sign-up-contact" data-section="sign-up">Advanced Form</a>
          <a href="#pricing" class="btn btn-outline tap-target" data-cta="compare-plans-sign-up" data-section="sign-up">Compare Plans</a>
        </div>
      </div>
    </section>

    <section id="final-cta" data-section="final-cta">
      <div class="container">
        <h2 class="section-headline">Something amazing is happening near you right now.</h2>
        <p>Join free. No credit card. Cancel anytime. Your city is waiting.</p>
        <div class="final-cta-actions">
          <a href="#sign-up" class="btn btn-primary tap-target" data-cta="find-hidden-gems-final" data-section="final-cta">Find My Hidden Gems — Free</a>
          <a href="#pricing" class="btn btn-secondary tap-target" data-cta="list-business-final" data-section="final-cta">List my business →</a>
        </div>
        <p class="hero-social-proof">Create a repeatable discovery and growth workflow with one setup profile.</p>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <div class="footer-inner">
        <div class="footer-brand">
          <a href="/" class="footer-logo">LocalGems</a>
          <p class="footer-tagline">Find your city's best-kept secrets.</p>
        </div>
        <div class="footer-nav-groups">
          <nav aria-label="Discover">
            <h3>Discover</h3>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#pricing">Consumer Pricing</a></li>
              <li><a href="#sign-up">Take the Quiz</a></li>
            </ul>
          </nav>
          <nav aria-label="For Businesses">
            <h3>For Businesses</h3>
            <ul>
              <li><a href="#pricing">Business Pricing</a></li>
              <li><a href="/analytics">Analytics Add-Ons</a></li>
              <li><a href="/partnership">Event Coordinator Program</a></li>
            </ul>
          </nav>
          <nav aria-label="Company">
            <h3>Company</h3>
            <ul>
              <li><a href="/about">About</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/press">Press</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </nav>
          <nav aria-label="Legal">
            <h3>Legal</h3>
            <ul>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/cookies">Cookie Policy</a></li>
            </ul>
          </nav>
        </div>
        <div class="footer-bottom">
          <div class="footer-social">
            <a href="https://instagram.com" aria-label="Follow us on Instagram" rel="noopener noreferrer">Instagram</a>
            <a href="https://tiktok.com" aria-label="Follow us on TikTok" rel="noopener noreferrer">TikTok</a>
            <a href="https://facebook.com" aria-label="Follow us on Facebook" rel="noopener noreferrer">Facebook</a>
            <a href="https://reddit.com" aria-label="Follow us on Reddit" rel="noopener noreferrer">Reddit</a>
          </div>
          <p class="footer-copyright">© 2026 LocalGems. All rights reserved.</p>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}
