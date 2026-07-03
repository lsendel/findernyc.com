import { SITE_NAME, SITE_URL, type SiteContext } from '../site/context';
import { absoluteUrl, type PageSeoMeta } from '../lib/page-seo';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function fontHeadHtml(): string {
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;
}

type NavLink = { href: string; label: string };

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/hidden-gems', label: 'Hidden Gems' },
  { href: '/neighborhoods', label: 'Neighborhoods' },
  { href: '/itineraries', label: 'Itineraries' },
  { href: '/tips', label: 'Practical Tips' },
];

export function navHtml(options?: { activePath?: string; site?: SiteContext }): string {
  const activePath = options?.activePath;
  const siteName = options?.site?.name ?? SITE_NAME;

  const desktopLinks = NAV_LINKS.map(
    (link) =>
      `<li><a href="${escapeHtml(link.href)}" class="nav-link tap-target${activePath === link.href ? ' nav-link--active' : ''}">${escapeHtml(link.label)}</a></li>`,
  ).join('');

  const drawerLinks = NAV_LINKS.map(
    (link) =>
      `<li><a href="${escapeHtml(link.href)}" class="drawer-nav-link tap-target${activePath === link.href ? ' nav-link--active' : ''}">${escapeHtml(link.label)}</a></li>`,
  ).join('');

  return `<a href="#main-content" class="skip-link">Skip to main content</a>
  <header class="site-header">
    <nav class="nav-desktop" aria-label="Desktop navigation">
      <a href="/" class="nav-logo" aria-label="${escapeHtml(siteName)} home">
        <span class="logo-text">${escapeHtml(siteName)}</span>
      </a>
      <ul class="nav-links" role="list">
        ${desktopLinks}
      </ul>
    </nav>
    <nav class="nav-mobile" aria-label="Mobile navigation">
      <a href="/" class="nav-logo" aria-label="${escapeHtml(siteName)} home">
        <span class="logo-text">${escapeHtml(siteName)}</span>
      </a>
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
          ${drawerLinks}
        </ul>
      </div>
    </div>
  </header>`;
}

export function footerHtml(site?: SiteContext): string {
  const siteName = site?.name ?? SITE_NAME;
  const tagline = site?.tagline ?? 'Skip the tourist traps.';
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-brand">
        <span class="footer-name">${escapeHtml(siteName)}</span>
        <span class="footer-tagline">${escapeHtml(tagline)}</span>
      </div>
      <nav class="footer-links" aria-label="Footer navigation">
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
      <p class="footer-copyright">&copy; 2026 ${escapeHtml(siteName)}. All rights reserved.</p>
    </div>
  </footer>`;
}

export function mobileNavScript(): string {
  return `(() => {
    const hamburger = document.getElementById('hamburger-btn');
    const closeBtn = document.getElementById('drawer-close-btn');
    const drawer = document.getElementById('mobile-drawer');
    const overlay = document.getElementById('drawer-overlay');
    if (!hamburger || !closeBtn || !drawer || !overlay) return;

    const closeDrawer = () => {
      drawer.setAttribute('hidden', '');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.focus();
    };

    hamburger.addEventListener('click', () => {
      drawer.removeAttribute('hidden');
      hamburger.setAttribute('aria-expanded', 'true');
      const focusable = drawer.querySelector('a[href], button:not([disabled])');
      if (focusable instanceof HTMLElement) focusable.focus();
    });
    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !drawer.hasAttribute('hidden')) closeDrawer();
    });
  })();`;
}

export function pageShell(meta: PageSeoMeta, bodyHtml: string): string {
  const site = meta.site;
  const siteUrl = site?.url ?? SITE_URL;
  const siteName = site?.name ?? SITE_NAME;
  const canonical = absoluteUrl(meta.path, site);
  const ogImage = absoluteUrl(meta.imagePath ?? '/images/og-image.jpg', site);
  const robots = meta.noindex ? 'noindex,nofollow' : 'index,follow';
  const structuredDataScripts = (meta.structuredData ?? [])
    .map((payload) => `<script type="application/ld+json">${JSON.stringify(payload)}</script>`)
    .join('\n  ');
  const articleMeta = meta.type === 'article'
    ? [
        meta.publishedTime ? `<meta property="article:published_time" content="${meta.publishedTime}">` : '',
        meta.modifiedTime ? `<meta property="article:modified_time" content="${meta.modifiedTime}">` : '',
      ].filter(Boolean).join('\n  ')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="${meta.type ?? 'website'}">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  ${articleMeta}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="theme-color" content="#0f1e24">
  ${fontHeadHtml()}
  <link rel="stylesheet" href="/css/styles.css">
  ${structuredDataScripts}
</head>
<body>
  ${navHtml({ activePath: meta.path, site })}
  <main id="main-content" class="page-main">
    ${bodyHtml}
  </main>
  ${footerHtml(site)}
  <script>${mobileNavScript()}</script>
  <script src="/js/main.js" defer></script>
</body>
</html>`;
}
