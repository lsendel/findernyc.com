import { describe, it, expect, beforeAll } from 'vitest';
import { landingPageHtml } from '../../src/templates/landing';

let doc: Document;

beforeAll(() => {
  const html = landingPageHtml();
  const parser = new DOMParser();
  doc = parser.parseFromString(html, 'text/html');
});

describe('Pricing section structure', () => {
  it('has 2 consumer tier cards in #pricing-consumer .pricing-cards', () => {
    const consumerCards = doc.querySelectorAll('#pricing-consumer .pricing-cards .pricing-card');
    expect(consumerCards.length).toBe(2);
  });

  it('has 3 business tier cards in #pricing-business .pricing-cards', () => {
    const businessCards = doc.querySelectorAll('#pricing-business .pricing-cards .pricing-card');
    expect(businessCards.length).toBe(3);
  });

  it('has .pricing-addon-note with text about add-ons', () => {
    const addonNote = doc.querySelector('.pricing-addon-note');
    expect(addonNote).not.toBeNull();
    const text = addonNote!.textContent!;
    expect(text.trim().length).toBeGreaterThan(0);
    expect(text.toLowerCase()).toContain('add');
  });
});
