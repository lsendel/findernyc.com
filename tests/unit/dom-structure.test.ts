import { beforeAll, describe, expect, it } from 'vitest';
import { landingPageHtml } from '../../src/templates/landing';

let doc: Document;

beforeAll(() => {
  doc = new DOMParser().parseFromString(landingPageHtml(), 'text/html');
});

describe('landing page structure', () => {
  it('includes FinderNYC SEO metadata', () => {
    expect(doc.querySelector('title')?.textContent).toContain('FinderNYC');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('Discover');
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://findernyc.com/');
  });

  it('renders the hero search with wired ids for typeahead', () => {
    expect(doc.getElementById('hero-search-input')).not.toBeNull();
    expect(doc.getElementById('hero-suggest-dropdown')).not.toBeNull();
  });

  it('renders navigation only to current public pages', () => {
    const hrefs = Array.from(doc.querySelectorAll('a[href]')).map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/hidden-gems');
    expect(hrefs).toContain('/neighborhoods');
    expect(hrefs).toContain('/itineraries');
    expect(hrefs).toContain('/tips');
    expect(hrefs).toContain('/privacy');
    expect(hrefs).toContain('/terms');
  });

  it('includes category pills and newsletter signup', () => {
    expect(doc.querySelectorAll('.category-pill').length).toBe(7);
    expect(doc.querySelectorAll('.gem-card').length).toBe(6);
    expect(doc.getElementById('newsletter-form')).not.toBeNull();
    expect(doc.getElementById('newsletter-status')?.getAttribute('aria-live')).toBe('polite');
  });
});
