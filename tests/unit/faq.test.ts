import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { landingPageHtml } from '../../src/templates/landing';

let document: Document;

beforeAll(() => {
  const dom = new JSDOM(landingPageHtml());
  document = dom.window.document;
});

describe('FAQ section', () => {
  it('has exactly 7 .faq-item elements', () => {
    const items = document.querySelectorAll('.faq-item');
    expect(items.length).toBe(7);
  });

  it('has a closing support line with "Chat with us" text', () => {
    const supportLine = document.querySelector('.faq-support-line');
    expect(supportLine).not.toBeNull();
    expect(supportLine!.textContent).toContain('Chat with us');
  });
});

describe('Footer section', () => {
  it('has 4 social icon links each with aria-label', () => {
    const socialLinks = document.querySelectorAll('.footer-social a[aria-label]');
    expect(socialLinks.length).toBe(4);
  });

  it('has a copyright line containing "©" and "LocalGems"', () => {
    const copyright = document.querySelector('.footer-copyright');
    expect(copyright).not.toBeNull();
    expect(copyright!.textContent).toContain('©');
    expect(copyright!.textContent).toContain('LocalGems');
  });
});
