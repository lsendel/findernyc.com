import { describe, it, expect, beforeAll } from 'vitest';
import { landingPageHtml } from '../../src/templates/landing';

let doc: Document;

beforeAll(() => {
  const parser = new DOMParser();
  doc = parser.parseFromString(landingPageHtml(), 'text/html');
});

describe('SEO head tags', () => {
  it('includes canonical URL', () => {
    const canonical = doc.querySelector('link[rel="canonical"]');
    expect(canonical).not.toBeNull();
    expect(canonical!.getAttribute('href')).toBe('https://findernyc.com/');
  });

  it('includes robots meta tag', () => {
    const robots = doc.querySelector('meta[name="robots"]');
    expect(robots).not.toBeNull();
    expect(robots!.getAttribute('content')).toContain('index,follow');
  });

  it('includes twitter card metadata', () => {
    const twitterCard = doc.querySelector('meta[name="twitter:card"]');
    const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
    const twitterDescription = doc.querySelector('meta[name="twitter:description"]');
    expect(twitterCard).not.toBeNull();
    expect(twitterTitle).not.toBeNull();
    expect(twitterDescription).not.toBeNull();
  });

  it('includes JSON-LD scripts for website, organization, and FAQ', () => {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    expect(scripts.length).toBeGreaterThanOrEqual(3);
    const payload = scripts.map((s) => s.textContent ?? '').join('\n');
    expect(payload).toContain('"@type":"WebSite"');
    expect(payload).toContain('"@type":"Organization"');
    expect(payload).toContain('"@type":"FAQPage"');
    expect(payload).not.toContain('https://instagram.com');
    expect(payload).not.toContain('https://tiktok.com');
  });
});
