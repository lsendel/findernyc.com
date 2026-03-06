// Feature: local-event-discovery-landing-page, WCAG 2.1 AA full-page axe-core scan
// Validates: Requirements 1.10, 13.5

import { describe, it, expect, beforeAll } from 'vitest';
import axe from 'axe-core';
import { landingPageHtml } from '../../src/templates/landing';

let results: axe.AxeResults;

beforeAll(async () => {
  document.documentElement.innerHTML = landingPageHtml();
  // landingPageHtml() includes <html lang="en"> but setting innerHTML on documentElement
  // strips attributes — restore the lang attribute explicitly
  document.documentElement.setAttribute('lang', 'en');
  results = await axe.run(document, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
  });
});

describe('WCAG 2.1 AA full-page axe-core scan', () => {
  it('has zero accessibility violations', () => {
    if (results.violations.length > 0) {
      const violationSummary = results.violations
        .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} node(s))`)
        .join('\n');
      expect.fail(`axe-core found ${results.violations.length} violation(s):\n${violationSummary}`);
    }
    expect(results.violations.length).toBe(0);
  });
});
