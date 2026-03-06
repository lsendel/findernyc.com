import { describe, it, expect, beforeAll } from 'vitest';
import { landingPageHtml } from '../../src/templates/landing';

const SEO_KEYWORDS = ['local events', 'things to do near me', 'hidden gems', 'local event discovery'];

let doc: Document;

beforeAll(() => {
  const html = landingPageHtml();
  const parser = new DOMParser();
  doc = parser.parseFromString(html, 'text/html');
});

describe('document <head>', () => {
  it('<title> is 60 characters or fewer', () => {
    const title = doc.querySelector('title');
    expect(title).not.toBeNull();
    expect(title!.textContent!.length).toBeLessThanOrEqual(60);
  });

  it('<title> contains "local event discovery" (case-insensitive)', () => {
    const title = doc.querySelector('title');
    expect(title!.textContent!.toLowerCase()).toContain('local event discovery');
  });

  it('<meta name="description"> content is 120–155 characters', () => {
    const meta = doc.querySelector('meta[name="description"]');
    expect(meta).not.toBeNull();
    const content = meta!.getAttribute('content')!;
    expect(content.length).toBeGreaterThanOrEqual(120);
    expect(content.length).toBeLessThanOrEqual(155);
  });

  it('<meta name="description"> contains at least 2 SEO keywords', () => {
    const meta = doc.querySelector('meta[name="description"]');
    const content = meta!.getAttribute('content')!.toLowerCase();
    const matchCount = SEO_KEYWORDS.filter((kw) => content.includes(kw)).length;
    expect(matchCount).toBeGreaterThanOrEqual(2);
  });

  it('og:title meta tag is present', () => {
    const og = doc.querySelector('meta[property="og:title"]');
    expect(og).not.toBeNull();
    expect(og!.getAttribute('content')).toBeTruthy();
  });

  it('og:description meta tag is present', () => {
    const og = doc.querySelector('meta[property="og:description"]');
    expect(og).not.toBeNull();
    expect(og!.getAttribute('content')).toBeTruthy();
  });

  it('og:image meta tag is present', () => {
    const og = doc.querySelector('meta[property="og:image"]');
    expect(og).not.toBeNull();
    expect(og!.getAttribute('content')).toBeTruthy();
  });

  it('loads the production app script from /js/main.js in <head>', () => {
    const scripts = Array.from(doc.head.querySelectorAll('script'));
    const mainScript = scripts.find((s) => s.getAttribute('src') === '/js/main.js');
    expect(mainScript).not.toBeUndefined();
    expect(mainScript?.hasAttribute('defer')).toBe(true);
  });
});

describe('Hero section structure', () => {
  it('<main> element is present', () => {
    const main = doc.querySelector('main');
    expect(main).not.toBeNull();
  });

  it('#hero section is present with data-section="hero"', () => {
    const hero = doc.querySelector('#hero');
    expect(hero).not.toBeNull();
    expect(hero!.getAttribute('data-section')).toBe('hero');
  });

  it('<h1> is present inside #hero', () => {
    const h1 = doc.querySelector('#hero h1');
    expect(h1).not.toBeNull();
    expect(h1!.textContent!.trim().length).toBeGreaterThan(0);
  });

  it('hero has .hero-content with .hero-text and .hero-visual', () => {
    const heroContent = doc.querySelector('#hero .hero-content');
    expect(heroContent).not.toBeNull();
    expect(heroContent!.querySelector('.hero-text')).not.toBeNull();
    expect(heroContent!.querySelector('.hero-visual')).not.toBeNull();
  });

  it('hero image has descriptive alt text', () => {
    const heroImg = doc.querySelector('#hero img');
    expect(heroImg).not.toBeNull();
    const alt = heroImg!.getAttribute('alt');
    expect(alt).toBeTruthy();
    expect(alt!.length).toBeGreaterThan(0);
  });
});

describe('Trust section structure', () => {
  it('#trust section is present with data-section="trust"', () => {
    const trust = doc.querySelector('#trust');
    expect(trust).not.toBeNull();
    expect(trust!.getAttribute('data-section')).toBe('trust');
  });

  it('.trust-grid is present inside #trust', () => {
    const trustGrid = doc.querySelector('#trust .trust-grid');
    expect(trustGrid).not.toBeNull();
  });

  it('trust section has exactly 6 trust items', () => {
    const items = doc.querySelectorAll('#trust .trust-item');
    expect(items.length).toBe(6);
  });
});
