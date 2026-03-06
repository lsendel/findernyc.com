import { describe, it, expect, beforeAll } from 'vitest';
import { landingPageHtml } from '../../src/templates/landing';

let doc: Document;

beforeAll(() => {
  const html = landingPageHtml();
  const parser = new DOMParser();
  doc = parser.parseFromString(html, 'text/html');
});

describe('Hero CTA labels', () => {
  it('primary CTA has exact text "Find Events Near Me — It\'s Free"', () => {
    const primary = doc.querySelector('[data-cta="find-events-hero"]');
    expect(primary).not.toBeNull();
    expect(primary!.textContent!.trim()).toBe("Find Events Near Me — It's Free");
  });

  it('secondary CTA has exact text "I\'m a local business →"', () => {
    const secondary = doc.querySelector('[data-cta="business-hero"]');
    expect(secondary).not.toBeNull();
    expect(secondary!.textContent!.trim()).toBe("I'm a local business →");
  });

  it('primary CTA links to #sign-up', () => {
    const primary = doc.querySelector('[data-cta="find-events-hero"]');
    expect(primary!.getAttribute('href')).toBe('#sign-up');
  });

  it('secondary CTA links to #pricing', () => {
    const secondary = doc.querySelector('[data-cta="business-hero"]');
    expect(secondary!.getAttribute('href')).toBe('#pricing');
  });
});

describe('Trust strip', () => {
  it('has between 4 and 6 trust indicators', () => {
    const trustGrid = doc.querySelector('.trust-grid');
    expect(trustGrid).not.toBeNull();
    const items = trustGrid!.querySelectorAll('.trust-item');
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.length).toBeLessThanOrEqual(6);
  });

  it('renders each trust indicator with a title and supporting description', () => {
    const trustGrid = doc.querySelector('.trust-grid');
    const items = Array.from(trustGrid!.querySelectorAll('.trust-item'));
    items.forEach((item) => {
      expect(item.querySelector('strong')?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      expect(item.querySelector('span')?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
    });
  });

  it('includes governance-focused trust language', () => {
    const trustGrid = doc.querySelector('.trust-grid');
    const text = trustGrid?.textContent?.toLowerCase() ?? '';
    expect(text).toContain('metadata');
    expect(text).toContain('routing');
    expect(text).toContain('accessibility');
    expect(text).toContain('automated');
  });
});
