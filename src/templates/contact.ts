import { SITE_NAME, SITE_URL, siteFontHeadHtml, siteHeaderHtml, siteMobileNavScript } from './content-page';

export function contactPageHtml(): string {
  const canonical = `${SITE_URL}/contact`;
  const ogImage = `${SITE_URL}/images/og-image.svg`;
  const header = siteHeaderHtml({
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/blog', label: 'Blog' },
    ],
    ctaHref: '/#sign-up',
    ctaLabel: 'Get Started Free',
    homeAriaLabel: `${SITE_NAME} home`,
  });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact LocalGems',
    url: canonical,
    isPartOf: SITE_URL,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact LocalGems | Join the Waitlist</title>
  <meta name="description" content="Contact LocalGems to join the waitlist, ask product questions, and get support for local event discovery and business listings.">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="Contact LocalGems | Join the Waitlist">
  <meta property="og:description" content="Contact LocalGems for waitlist access and support.">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Contact LocalGems | Join the Waitlist">
  <meta name="twitter:description" content="Contact LocalGems for waitlist access and support.">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="theme-color" content="#10243f">
  ${siteFontHeadHtml()}
  <link rel="stylesheet" href="/css/styles.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  ${header}
  <main id="main-content">
    <section id="contact-page">
      <div class="container">
        <div class="contact-page-layout">
          <div class="contact-page-main">
            <h1>Contact LocalGems and Join the Waitlist</h1>
            <p class="contact-intro">Share your goals and we will route you to the right onboarding path for discovery, marketing, or partnership workflows.</p>
            <p class="contact-response-time">Most requests are answered within one business day.</p>
            <div class="contact-quick-actions" aria-label="Popular requests">
              <a href="/analytics" class="btn btn-outline tap-target">Analytics Demo</a>
              <a href="/partnership" class="btn btn-outline tap-target">Partnership Program</a>
              <a href="/blog/llm-search-content-for-event-pages" class="btn btn-outline tap-target">LLM Search Guide</a>
            </div>
            <form id="contact-form" class="contact-form" novalidate>
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="email" required>
              <label for="city">City (optional)</label>
              <input id="city" name="city" type="text" autocomplete="address-level2">
              <label for="zip_code">ZIP Code (optional)</label>
              <input id="zip_code" name="zip_code" type="text" inputmode="numeric" autocomplete="postal-code" pattern="\\d{5}(-\\d{4})?">
              <label for="use_case">What best describes your use case?</label>
              <select id="use_case" name="use_case">
                <option value="">Not specified</option>
                <option value="consumer_discovery">I want better local event discovery</option>
                <option value="business_listing">I manage business listings or events</option>
                <option value="marketing_analytics">I need marketing analytics and ranking insights</option>
                <option value="agency_partnership">I want an agency or partnership program</option>
              </select>
              <label for="team_size">Team size</label>
              <select id="team_size" name="team_size">
                <option value="">Not specified</option>
                <option value="solo">Solo</option>
                <option value="small_2_10">2-10</option>
                <option value="mid_11_50">11-50</option>
                <option value="enterprise_50_plus">50+</option>
              </select>
              <label for="goal">Primary goal (optional)</label>
              <textarea id="goal" name="goal" rows="3" maxlength="180" placeholder="Example: Improve local SEO CTR and convert discovery traffic to inquiries."></textarea>
              <div id="contact-goal-templates" class="contact-goal-templates" aria-label="Goal starter templates">
                <p class="contact-goal-templates-label">Goal starters</p>
                <div id="contact-goal-template-buttons" class="contact-goal-template-buttons">
                  <button type="button" class="btn btn-outline tap-target contact-goal-template-btn" data-goal-template-id="default_conversion_focus">Improve discovery-to-inquiry conversion quality this month.</button>
                </div>
              </div>
              <div id="contact-readiness" class="contact-readiness" aria-live="polite">
                <p id="contact-readiness-score" class="contact-readiness-score">Submission readiness: --</p>
                <ul id="contact-readiness-list" class="contact-readiness-list">
                  <li class="contact-readiness-item">Complete form details to see readiness guidance.</li>
                </ul>
              </div>
              <p id="contact-route-preview" class="contact-status"></p>
              <div id="contact-route-plan" class="contact-route-plan" aria-live="polite">
                <p id="contact-route-plan-title" class="contact-route-plan-title">Action plan: Complete form details to unlock a tailored route plan.</p>
                <p id="contact-route-sla" class="contact-route-plan-sla">Response target: --</p>
                <p id="contact-route-hint" class="contact-route-hint" hidden></p>
                <p id="contact-route-rationale" class="contact-route-rationale" hidden></p>
                <ul id="contact-route-plan-list" class="contact-route-plan-list">
                  <li class="contact-route-plan-item">Select your use case, team size, and goal to receive a concrete plan.</li>
                </ul>
                <a id="contact-route-guide" class="btn btn-outline tap-target" href="/blog" hidden>Open preparation guide</a>
              </div>
              <button id="contact-submit-button" class="btn btn-primary tap-target" type="submit">Join Waitlist</button>
              <p id="contact-status" class="contact-status" role="status" aria-live="polite"></p>
              <a id="contact-next-action" class="btn btn-outline tap-target" href="/" hidden>Continue to next step</a>
            </form>
          </div>
          <aside class="contact-page-sidebar">
            <section class="contact-side-card" aria-label="What happens next">
              <h2>What Happens Next</h2>
              <ol class="contact-side-list">
                <li>We review your use case and team context.</li>
                <li>We route you to the right onboarding track.</li>
                <li>You receive a concrete next-step plan by email.</li>
              </ol>
            </section>
            <section class="contact-side-card" aria-label="Best fit">
              <h2>Best Fit For</h2>
              <div class="contact-side-chip-list">
                <span class="contact-side-chip">Local Marketers</span>
                <span class="contact-side-chip">Event Operators</span>
                <span class="contact-side-chip">Agency Teams</span>
                <span class="contact-side-chip">Residents</span>
              </div>
            </section>
            <section class="contact-side-card" aria-label="Preparation tips">
              <h2>Before You Submit</h2>
              <p>Include your city, use case, and current ranking or conversion goal so we can give you a more specific response.</p>
            </section>
            <section class="contact-side-card" aria-label="Response confidence">
              <h2>Response Confidence</h2>
              <p>Submissions with use case, city context, and a concrete goal are typically routed in under one business day.</p>
            </section>
          </aside>
        </div>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="container">
      <p class="footer-copyright">© 2026 ${SITE_NAME}. All rights reserved.</p>
    </div>
  </footer>
  <script>${siteMobileNavScript()}</script>
  <script src="/js/contact.js" defer></script>
</body>
</html>`;
}
