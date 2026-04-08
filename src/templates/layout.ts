export const SITE_NAME = 'FinderNYC';
export const SITE_URL = 'https://findernyc.com';

// Multi-domain site context
export type SiteContext = {
  name: string;
  url: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  metaTitle: string;
  metaDescription: string;
  city: string | null; // null = multi-city umbrella
};

const SITES: Record<string, SiteContext> = {
  'findernyc.com': {
    name: 'FinderNYC',
    url: 'https://findernyc.com',
    tagline: 'Skip the tourist traps.',
    heroTitle: 'Skip the tourist traps.\nHere\'s where real New Yorkers actually go.',
    heroSubtitle: 'Curated by locals, not algorithms. Hidden gems, honest tips, zero BS.',
    metaTitle: 'FinderNYC — Skip the Tourist Traps. Real NYC Hidden Gems.',
    metaDescription: 'Discover where real New Yorkers actually go. Hidden gems, local tips, and honest recommendations.',
    city: 'NYC',
  },
  'hiddencitygems.com': {
    name: 'Hidden City Gems',
    url: 'https://hiddencitygems.com',
    tagline: 'Skip the tourist traps.',
    heroTitle: 'Skip the tourist traps.\nDiscover where locals actually go.',
    heroSubtitle: 'Real recommendations from real locals. Hidden gems, honest tips, zero BS.',
    metaTitle: 'Hidden City Gems — Skip the Tourist Traps. Real Local Recommendations.',
    metaDescription: 'Discover hidden gems in cities around the world. Real recommendations from locals, not algorithms.',
    city: null,
  },
  'experiences.miami': {
    name: 'Experiences Miami',
    url: 'https://experiences.miami',
    tagline: 'The real Miami.',
    heroTitle: 'Skip the tourist traps.\nHere\'s where real Miami locals actually go.',
    heroSubtitle: 'Curated by locals, not algorithms. Hidden gems, honest tips, zero BS.',
    metaTitle: 'Experiences Miami — Skip the Tourist Traps. Real Miami Hidden Gems.',
    metaDescription: 'Discover where real Miami locals actually go. Hidden gems, local tips, and honest recommendations.',
    city: 'Miami',
  },
  'mmeexx.com': {
    name: 'MMEEXX',
    url: 'https://mmeexx.com',
    tagline: 'Lo que los locales no te cuentan.',
    heroTitle: 'Olvídate de las trampas para turistas.\nDescubre adónde van los locales de verdad.',
    heroSubtitle: 'Recomendado por locales, no por algoritmos. Joyas escondidas, tips honestos, cero BS.',
    metaTitle: 'MMEEXX — Joyas Escondidas en México. Recomendaciones Locales.',
    metaDescription: 'Descubre adónde van los locales de verdad en México. Joyas escondidas, tips honestos y recomendaciones reales.',
    city: 'Mexico',
  },
};

const DEFAULT_SITE = SITES['findernyc.com'];

export function getSiteContext(hostname: string): SiteContext {
  // Strip www. and port
  const clean = hostname.replace(/^www\./, '').split(':')[0];
  return SITES[clean] ?? DEFAULT_SITE;
}

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
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;
}

type NavLink = { href: string; label: string };

const NAV_LINKS: NavLink[] = [
  { href: '/search', label: 'Explore' },
  { href: '/neighborhoods', label: 'Neighborhoods' },
  { href: '/guides', label: 'Guides' },
  { href: '/about', label: 'About' },
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

export type PageMeta = {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  structuredData?: unknown[];
  site?: SiteContext;
};

export function pageShell(meta: PageMeta, bodyHtml: string): string {
  const site = meta.site;
  const siteUrl = site?.url ?? SITE_URL;
  const siteName = site?.name ?? SITE_NAME;
  const canonical = `${siteUrl}${meta.path}`;
  const ogImage = `${siteUrl}/images/og-image.svg`;
  const robots = meta.noindex ? 'noindex,nofollow' : 'index,follow';
  const structuredDataScripts = (meta.structuredData ?? [])
    .map((payload) => `<script type="application/ld+json">${JSON.stringify(payload)}</script>`)
    .join('\n  ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(siteName)}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta name="theme-color" content="#10243f">
  ${fontHeadHtml()}
  <link rel="stylesheet" href="/css/styles.css">
  ${structuredDataScripts}
</head>
<body>
  ${navHtml({ activePath: meta.path, site })}
  <main id="main-content">
    ${bodyHtml}
  </main>
  ${footerHtml(site)}
  <script>${mobileNavScript()}</script>
  <script src="/js/main.js" defer></script>
</body>
</html>`;
}
