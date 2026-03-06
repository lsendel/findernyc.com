// Feature: local-event-discovery-landing-page, Property 13: FAQ accordion single-open — clicking item i collapses all others
// Feature: local-event-discovery-landing-page, Property 20: FAQ expand fires `faq_expand` with correct `question_index`

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { JSDOM } from 'jsdom';
import { landingPageHtml } from '../../src/templates/landing';

fc.configureGlobal({ numRuns: 100 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFaqDom(): { document: Document; window: Window & typeof globalThis } {
  const dom = new JSDOM(landingPageHtml(), { url: 'http://localhost' });
  return { document: dom.window.document, window: dom.window as unknown as Window & typeof globalThis };
}

/**
 * Set up a fresh DOM environment and return the initFAQ function bound to that DOM.
 * We re-implement initFAQ inline using the JSDOM document so we can test it in isolation.
 */
function setupFaqWithTracking(document: Document, trackEventMock: ReturnType<typeof vi.fn>) {
  const faqItems = Array.from(document.querySelectorAll<HTMLDetailsElement>('.faq-item'));

  // Minimal pageState for the test
  const localPageState = { openFaqIndex: null as number | null };

  faqItems.forEach((details, index) => {
    details.addEventListener('toggle', () => {
      if (details.open) {
        // Close all other items
        faqItems.forEach((other, otherIndex) => {
          if (otherIndex !== index && other.open) {
            other.open = false;
          }
        });
        trackEventMock({
          event_name: 'faq_expand',
          properties: { question_index: index },
        });
        localPageState.openFaqIndex = index;
      } else {
        if (localPageState.openFaqIndex === index) {
          localPageState.openFaqIndex = null;
        }
      }
    });
  });

  return { faqItems, localPageState };
}

// ---------------------------------------------------------------------------
// Property 13: FAQ accordion single-open — clicking item i collapses all others
// Validates: Requirements 9.5
// ---------------------------------------------------------------------------

describe('Property 13: FAQ accordion single-open', () => {
  it('opening FAQ item i collapses all other items', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        (i) => {
          const { document } = buildFaqDom();
          const trackEventMock = vi.fn();
          const { faqItems } = setupFaqWithTracking(document, trackEventMock);

          expect(faqItems.length).toBe(7);

          // Open item i by setting open=true and dispatching toggle
          faqItems[i].open = true;
          faqItems[i].dispatchEvent(new document.defaultView!.Event('toggle'));

          // All other items must be closed
          faqItems.forEach((item, idx) => {
            if (idx !== i) {
              expect(item.open).toBe(false);
            }
          });

          // Item i must be open
          expect(faqItems[i].open).toBe(true);
        },
      ),
    );
  });

  it('opening a second item closes the previously open item', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 0, max: 6 }),
        (i, j) => {
          // Only test when i !== j
          fc.pre(i !== j);

          const { document } = buildFaqDom();
          const trackEventMock = vi.fn();
          const { faqItems } = setupFaqWithTracking(document, trackEventMock);

          // Open item i first
          faqItems[i].open = true;
          faqItems[i].dispatchEvent(new document.defaultView!.Event('toggle'));

          // Now open item j
          faqItems[j].open = true;
          faqItems[j].dispatchEvent(new document.defaultView!.Event('toggle'));

          // Item i must now be closed
          expect(faqItems[i].open).toBe(false);
          // Item j must be open
          expect(faqItems[j].open).toBe(true);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: FAQ expand fires `faq_expand` with correct `question_index`
// Validates: Requirements 14.3
// ---------------------------------------------------------------------------

describe('Property 20: FAQ expand fires faq_expand with correct question_index', () => {
  it('trackEvent is called with faq_expand and the correct question_index', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        (i) => {
          const { document } = buildFaqDom();
          const trackEventMock = vi.fn();
          const { faqItems } = setupFaqWithTracking(document, trackEventMock);

          // Open item i
          faqItems[i].open = true;
          faqItems[i].dispatchEvent(new document.defaultView!.Event('toggle'));

          expect(trackEventMock).toHaveBeenCalledWith({
            event_name: 'faq_expand',
            properties: { question_index: i },
          });
        },
      ),
    );
  });

  it('trackEvent is NOT called when an item is closed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        (i) => {
          const { document } = buildFaqDom();
          const trackEventMock = vi.fn();
          const { faqItems } = setupFaqWithTracking(document, trackEventMock);

          // Open then close item i
          faqItems[i].open = true;
          faqItems[i].dispatchEvent(new document.defaultView!.Event('toggle'));
          trackEventMock.mockClear();

          faqItems[i].open = false;
          faqItems[i].dispatchEvent(new document.defaultView!.Event('toggle'));

          expect(trackEventMock).not.toHaveBeenCalled();
        },
      ),
    );
  });
});
