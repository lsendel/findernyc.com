export const SITE_NAME = 'FinderNYC';
export const SITE_URL = 'https://findernyc.com';

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

export function navHtml(options?: { activePath?: string }): string {
  const activePath = options?.activePath;

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
      <a href="/" class="nav-logo" aria-label="${SITE_NAME} home">
        <span class="logo-text">${SITE_NAME}</span>
      </a>
      <ul class="nav-links" role="list">
        ${desktopLinks}
      </ul>
    </nav>
    <nav class="nav-mobile" aria-label="Mobile navigation">
      <a href="/" class="nav-logo" aria-label="${SITE_NAME} home">
        <span class="logo-text">${SITE_NAME}</span>
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

export function footerHtml(): string {
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-brand">
        <span class="footer-name">${SITE_NAME}</span>
        <span class="footer-tagline">Skip the tourist traps.</span>
      </div>
      <nav class="footer-links" aria-label="Footer navigation">
        <a href="/about">About</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
      <p class="footer-copyright">&copy; 2026 ${SITE_NAME}. All rights reserved.</p>
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
};

export function pageShell(meta: PageMeta, bodyHtml: string): string {
  const canonical = `${SITE_URL}${meta.path}`;
  const ogImage = `${SITE_URL}/images/og-image.svg`;
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
  <meta property="og:site_name" content="${SITE_NAME}">
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
  ${navHtml({ activePath: meta.path })}
  <main id="main-content">
    ${bodyHtml}
  </main>
  ${footerHtml()}
  <script>${mobileNavScript()}</script>
  <script src="/js/main.js" defer></script>
</body>
</html>`;
}
