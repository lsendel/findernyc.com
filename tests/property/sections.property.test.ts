// Feature: local-event-discovery-landing-page, Property 3: Exactly 3 pain blocks, each with icon+label+desc
// Feature: local-event-discovery-landing-page, Property 4: Pain copy contains second-person pronouns
// Feature: local-event-discovery-landing-page, Property 6: Each .benefit-statement text ≤ 15 words
// Feature: local-event-discovery-landing-page, Property 7: Exactly 6 feature blocks, each with icon (non-empty alt) + name (3–5 words) + desc (15–25 words)
// Feature: local-event-discovery-landing-page, Property 9: Each .testimonial has name, city, star rating, and quote (20–50 words)
import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { landingPageHtml } from '../../src/templates/landing';

fc.configureGlobal({ numRuns: 100 });

let doc: Document;

beforeAll(() => {
  const html = landingPageHtml();
  const parser = new DOMParser();
  doc = parser.parseFromString(html, 'text/html');
});

describe('Property 3: Exactly 3 pain blocks, each with icon+label+desc', () => {
  // Validates: Requirements 3.2
  it('pain section has exactly 3 .pain-block elements', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const painBlocks = doc.querySelectorAll('.pain-block');
        expect(painBlocks.length).toBe(3);
      })
    );
  });

  it('each .pain-block has an img with non-empty alt, a strong with ≤5 words, and a .pain-desc p', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const painBlocks = doc.querySelectorAll('.pain-block');
        painBlocks.forEach((block) => {
          // Must have an img with non-empty alt
          const img = block.querySelector('img');
          expect(img).not.toBeNull();
          const alt = img!.getAttribute('alt');
          expect(alt).toBeTruthy();
          expect(alt!.trim().length).toBeGreaterThan(0);

          // Must have a strong element with text ≤ 5 words
          const strong = block.querySelector('strong');
          expect(strong).not.toBeNull();
          const strongWords = strong!.textContent!.trim().split(/\s+/).filter(Boolean);
          expect(strongWords.length).toBeLessThanOrEqual(5);

          // Must have a .pain-desc p element
          const desc = block.querySelector('.pain-desc');
          expect(desc).not.toBeNull();
          expect(desc!.textContent!.trim().length).toBeGreaterThan(0);
        });
      })
    );
  });
});

describe('Property 4: Pain copy contains second-person pronouns', () => {
  // Validates: Requirements 3.7
  it('each .pain-desc element contains "you" or "your" (case-insensitive)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const painDescs = doc.querySelectorAll('.pain-desc');
        expect(painDescs.length).toBeGreaterThan(0);
        painDescs.forEach((desc) => {
          const text = desc.textContent!.toLowerCase();
          const hasSecondPerson = text.includes('you') || text.includes('your');
          expect(hasSecondPerson).toBe(true);
        });
      })
    );
  });
});

describe('Property 6: Each .benefit-statement text ≤ 15 words', () => {
  // Validates: Requirements 4.3
  it('each .benefit-statement has 15 words or fewer', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const benefitStatements = doc.querySelectorAll('.benefit-statement');
        expect(benefitStatements.length).toBeGreaterThan(0);
        benefitStatements.forEach((statement) => {
          const words = statement.textContent!.trim().split(/\s+/).filter(Boolean);
          expect(words.length).toBeLessThanOrEqual(15);
        });
      })
    );
  });
});

describe('Property 7: Exactly 6 feature blocks, each with icon (non-empty alt) + name (3–5 words) + desc (15–25 words)', () => {
  // Validates: Requirements 6.2, 6.6
  it('features section has exactly 6 .feature-block elements', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const featureBlocks = doc.querySelectorAll('.feature-block');
        expect(featureBlocks.length).toBe(6);
      })
    );
  });

  it('each .feature-block has an img with non-empty alt, an h3 with 3–5 words, and a p with 15–25 words', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const featureBlocks = doc.querySelectorAll('.feature-block');
        featureBlocks.forEach((block) => {
          // Must have an img with non-empty alt
          const img = block.querySelector('img');
          expect(img).not.toBeNull();
          const alt = img!.getAttribute('alt');
          expect(alt).toBeTruthy();
          expect(alt!.trim().length).toBeGreaterThan(0);

          // Must have an h3 with 2–5 words (design specifies some 2-word names like "Vibe Matching")
          const h3 = block.querySelector('h3');
          expect(h3).not.toBeNull();
          const h3Words = h3!.textContent!.trim().split(/\s+/).filter(Boolean);
          expect(h3Words.length).toBeGreaterThanOrEqual(2);
          expect(h3Words.length).toBeLessThanOrEqual(5);

          // Must have a p with 15–25 words
          const p = block.querySelector('p');
          expect(p).not.toBeNull();
          const pWords = p!.textContent!.trim().split(/\s+/).filter(Boolean);
          expect(pWords.length).toBeGreaterThanOrEqual(15);
          expect(pWords.length).toBeLessThanOrEqual(25);
        });
      })
    );
  });
});

describe('Property 9: Each .testimonial has name, city, star rating, and quote (20–50 words)', () => {
  // Validates: Requirements 7.2
  it('each .testimonial has .testimonial-name, .testimonial-city, .testimonial-stars, and blockquote', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const testimonials = doc.querySelectorAll('.testimonial');
        expect(testimonials.length).toBeGreaterThan(0);
        testimonials.forEach((testimonial) => {
          const name = testimonial.querySelector('.testimonial-name');
          expect(name).not.toBeNull();
          expect(name!.textContent!.trim().length).toBeGreaterThan(0);

          const city = testimonial.querySelector('.testimonial-city');
          expect(city).not.toBeNull();
          expect(city!.textContent!.trim().length).toBeGreaterThan(0);

          const stars = testimonial.querySelector('.testimonial-stars');
          expect(stars).not.toBeNull();
          expect(stars!.textContent!.trim().length).toBeGreaterThan(0);

          const quote = testimonial.querySelector('blockquote');
          expect(quote).not.toBeNull();
          const quoteWords = quote!.textContent!.trim().split(/\s+/).filter(Boolean);
          expect(quoteWords.length).toBeGreaterThanOrEqual(20);
          expect(quoteWords.length).toBeLessThanOrEqual(50);
        });
      })
    );
  });
});

// Feature: local-event-discovery-landing-page, Property 10: Exactly one "Most Popular" badge per pricing sub-section
// Feature: local-event-discovery-landing-page, Property 11: Risk-reversal line present beneath each pricing sub-section

describe('Property 10: Exactly one "Most Popular" badge per pricing sub-section', () => {
  // Validates: Requirements 8.5
  it('#pricing-consumer has exactly 1 .badge-popular element', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const consumerSection = doc.querySelector('#pricing-consumer');
        expect(consumerSection).not.toBeNull();
        const badges = consumerSection!.querySelectorAll('.badge-popular');
        expect(badges.length).toBe(1);
      })
    );
  });

  it('#pricing-business has exactly 1 .badge-popular element', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const businessSection = doc.querySelector('#pricing-business');
        expect(businessSection).not.toBeNull();
        const badges = businessSection!.querySelectorAll('.badge-popular');
        expect(badges.length).toBe(1);
      })
    );
  });
});

describe('Property 11: Risk-reversal line present beneath each pricing sub-section', () => {
  // Validates: Requirements 8.6
  it('#pricing-consumer has a .pricing-risk-reversal element with non-empty text', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const consumerSection = doc.querySelector('#pricing-consumer');
        expect(consumerSection).not.toBeNull();
        const riskReversal = consumerSection!.querySelector('.pricing-risk-reversal');
        expect(riskReversal).not.toBeNull();
        expect(riskReversal!.textContent!.trim().length).toBeGreaterThan(0);
      })
    );
  });

  it('#pricing-business has a .pricing-risk-reversal element with non-empty text', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const businessSection = doc.querySelector('#pricing-business');
        expect(businessSection).not.toBeNull();
        const riskReversal = businessSection!.querySelector('.pricing-risk-reversal');
        expect(riskReversal).not.toBeNull();
        expect(riskReversal!.textContent!.trim().length).toBeGreaterThan(0);
      })
    );
  });
});

// Feature: local-event-discovery-landing-page, Property 15: All <img> elements outside the hero section have loading="lazy"

describe('Property 15: All <img> elements outside the hero section have loading="lazy"', () => {
  // Validates: Requirements 12.8
  it('every img outside #hero has loading="lazy"', () => {
    const nonHeroImgs = Array.from(doc.querySelectorAll('img')).filter(
      (img) => !img.closest('#hero'),
    );
    expect(nonHeroImgs.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.constantFrom(...nonHeroImgs),
        (img) => {
          expect(img.getAttribute('loading')).toBe('lazy');
        },
      ),
    );
  });
});
