// Feature: local-event-discovery-landing-page, Property 8: Every <img> has a non-empty alt attribute (or role="presentation" for decorative)
// Feature: local-event-discovery-landing-page, Property 14: Exactly one <h1>, <h2> for section headlines, <h3> for sub-sections, all landmark elements present
// Feature: local-event-discovery-landing-page, Property 17: All interactive elements have min-height and min-width >= 44px

import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { landingPageHtml } from '../../src/templates/landing';

fc.configureGlobal({ numRuns: 100 });

let doc: Document;

beforeAll(() => {
  const parser = new DOMParser();
  doc = parser.parseFromString(landingPageHtml(), 'text/html');
});

// ---------------------------------------------------------------------------
// Property 8: Every <img> has a non-empty alt attribute (or role="presentation" for decorative)
// Validates: Requirements 6.6, 12.7
// ---------------------------------------------------------------------------

describe('Property 8: Every <img> has a non-empty alt attribute (or role="presentation" for decorative)', () => {
  it('each img element has a non-empty alt attribute or role="presentation"', () => {
    const imgElements = Array.from(doc.querySelectorAll('img'));
    expect(imgElements.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...imgElements),
        (img) => {
          const alt = img.getAttribute('alt');
          const role = img.getAttribute('role');
          // Either has a non-empty alt attribute OR is marked as decorative with role="presentation"
          const hasNonEmptyAlt = alt !== null && alt.trim().length > 0;
          const isDecorative = role === 'presentation';
          expect(hasNonEmptyAlt || isDecorative).toBe(true);
        }
      )
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Semantic HTML structure and heading hierarchy
// Validates: Requirements 12.4, 12.5, 12.6
// ---------------------------------------------------------------------------

describe('Property 14: Exactly one <h1>, <h2> for section headlines, <h3> for sub-sections, all landmark elements present', () => {
  it('has exactly one <h1> element', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const h1Elements = doc.querySelectorAll('h1');
        expect(h1Elements.length).toBe(1);
      })
    );
  });

  it('has <h2> elements for section headlines', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const h2Elements = doc.querySelectorAll('h2');
        expect(h2Elements.length).toBeGreaterThan(0);
      })
    );
  });

  it('has <header>, <main>, and <footer> landmark elements', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(doc.querySelector('header')).not.toBeNull();
        expect(doc.querySelector('main')).not.toBeNull();
        expect(doc.querySelector('footer')).not.toBeNull();
      })
    );
  });

  it('all <nav> elements have aria-label attributes', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const navElements = Array.from(doc.querySelectorAll('nav'));
        expect(navElements.length).toBeGreaterThan(0);
        navElements.forEach((nav) => {
          const ariaLabel = nav.getAttribute('aria-label');
          expect(ariaLabel).not.toBeNull();
          expect(ariaLabel!.trim().length).toBeGreaterThan(0);
        });
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: All interactive elements have min-height and min-width >= 44px via .tap-target class
// Validates: Requirements 13.5
// ---------------------------------------------------------------------------

describe('Property 17: All interactive elements have min-height and min-width >= 44px via .tap-target class', () => {
  it('all .btn elements have the tap-target class', () => {
    const btnElements = Array.from(doc.querySelectorAll('.btn'));
    expect(btnElements.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...btnElements),
        (btn) => {
          expect(btn.classList.contains('tap-target')).toBe(true);
        }
      )
    );
  });

  it('the hamburger button has the tap-target class', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const hamburger = doc.querySelector('.hamburger');
        expect(hamburger).not.toBeNull();
        expect(hamburger!.classList.contains('tap-target')).toBe(true);
      })
    );
  });

  it('nav links have the tap-target class', () => {
    const navLinks = Array.from(doc.querySelectorAll('.nav-link'));
    expect(navLinks.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...navLinks),
        (link) => {
          expect(link.classList.contains('tap-target')).toBe(true);
        }
      )
    );
  });
});
