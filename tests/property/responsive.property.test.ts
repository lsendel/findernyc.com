// Feature: local-event-discovery-landing-page, Property 5: All multi-column sections stack at <768px and expand to specified grid at >=768px
// Feature: local-event-discovery-landing-page, Property 16: Hamburger visible and desktop nav hidden at <768px; inverse at >=768px

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
// Property 5: All multi-column sections stack at <768px and expand to specified grid at >=768px
// Validates: Requirements 3.5, 3.6, 4.6, 4.7, 6.4, 6.5, 7.6, 7.7, 8.8
// ---------------------------------------------------------------------------
// Note: jsdom does NOT execute CSS or apply media queries.
// We test the HTML structure that enables responsive behavior — the grid
// container elements with the correct CSS classes that the stylesheet targets.

describe('Property 5: All multi-column sections stack at <768px and expand to specified grid at >=768px', () => {
  it('each multi-column grid container exists in the document', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '.pain-grid',
          '.features-grid',
          '.testimonials-grid',
          '.pricing-cards',
          '.steps-grid',
        ),
        (selector) => {
          const container = doc.querySelector(selector);
          expect(container, `Expected to find "${selector}" in the document`).not.toBeNull();
        },
      ),
    );
  });

  it('.pain-grid contains exactly 3 pain blocks', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const painGrid = doc.querySelector('.pain-grid');
        expect(painGrid).not.toBeNull();
        const blocks = painGrid!.querySelectorAll('.pain-block');
        expect(blocks.length).toBe(3);
      }),
    );
  });

  it('.features-grid contains exactly 6 feature blocks', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const featuresGrid = doc.querySelector('.features-grid');
        expect(featuresGrid).not.toBeNull();
        const blocks = featuresGrid!.querySelectorAll('.feature-block');
        expect(blocks.length).toBe(6);
      }),
    );
  });

  it('.testimonials-grid contains exactly 3 testimonials', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const testimonialsGrid = doc.querySelector('.testimonials-grid');
        expect(testimonialsGrid).not.toBeNull();
        const testimonials = testimonialsGrid!.querySelectorAll('.testimonial');
        expect(testimonials.length).toBe(3);
      }),
    );
  });

  it('.pricing-cards exists inside the consumer pricing sub-section', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const consumerSection = doc.querySelector('#pricing-consumer');
        expect(consumerSection).not.toBeNull();
        const pricingCards = consumerSection!.querySelector('.pricing-cards');
        expect(pricingCards).not.toBeNull();
      }),
    );
  });

  it('.steps-grid contains exactly 3 step elements', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const stepsGrid = doc.querySelector('.steps-grid');
        expect(stepsGrid).not.toBeNull();
        const steps = stepsGrid!.querySelectorAll('.step');
        expect(steps.length).toBe(3);
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Hamburger visible and desktop nav hidden at <768px; inverse at >=768px
// Validates: Requirements 13.4
// ---------------------------------------------------------------------------
// Note: jsdom does NOT apply CSS media queries.
// We test the HTML structure that enables this behavior:
//   - .nav-desktop exists (hidden at <768px via CSS)
//   - .nav-mobile exists (visible at <768px via CSS)
//   - .hamburger button exists inside .nav-mobile
//   - The hamburger has aria-label, aria-expanded, and aria-controls attributes

describe('Property 16: Hamburger visible and desktop nav hidden at <768px; inverse at >=768px', () => {
  it('HTML structure supports mobile viewport (<768px): .nav-mobile with .hamburger exists', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 320, max: 767 }),
        (_mobileWidth) => {
          // .nav-mobile must exist (CSS shows it at <768px)
          const navMobile = doc.querySelector('.nav-mobile');
          expect(navMobile, 'Expected .nav-mobile to exist').not.toBeNull();

          // .hamburger must exist inside .nav-mobile
          const hamburger = navMobile!.querySelector('.hamburger');
          expect(hamburger, 'Expected .hamburger inside .nav-mobile').not.toBeNull();
        },
      ),
    );
  });

  it('HTML structure supports desktop viewport (>=768px): .nav-desktop exists', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 768, max: 2560 }),
        (_desktopWidth) => {
          // .nav-desktop must exist (CSS shows it at >=768px)
          const navDesktop = doc.querySelector('.nav-desktop');
          expect(navDesktop, 'Expected .nav-desktop to exist').not.toBeNull();
        },
      ),
    );
  });

  it('hamburger button has required aria attributes for accessibility', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const hamburger = doc.querySelector('.nav-mobile .hamburger');
        expect(hamburger, 'Expected .hamburger inside .nav-mobile').not.toBeNull();

        const ariaLabel = hamburger!.getAttribute('aria-label');
        expect(ariaLabel, 'hamburger must have aria-label').not.toBeNull();
        expect(ariaLabel!.trim().length).toBeGreaterThan(0);

        const ariaExpanded = hamburger!.getAttribute('aria-expanded');
        expect(ariaExpanded, 'hamburger must have aria-expanded').not.toBeNull();

        const ariaControls = hamburger!.getAttribute('aria-controls');
        expect(ariaControls, 'hamburger must have aria-controls').not.toBeNull();
        expect(ariaControls!.trim().length).toBeGreaterThan(0);
      }),
    );
  });

  it('both .nav-desktop and .nav-mobile are present to support responsive switching', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(doc.querySelector('.nav-desktop')).not.toBeNull();
        expect(doc.querySelector('.nav-mobile')).not.toBeNull();
      }),
    );
  });
});
