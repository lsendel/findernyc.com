import { afterEach, describe, expect, it, vi } from 'vitest';
import { initFaqAccordionController } from '../../src/assets/js/faq-accordion';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('faq accordion controller', () => {
  it('tracks expansion, closes other items, and updates open index state', () => {
    document.body.innerHTML = `
      <details class="faq-item"><summary>Q1</summary><p>A1</p></details>
      <details class="faq-item"><summary>Q2</summary><p>A2</p></details>
      <details class="faq-item"><summary>Q3</summary><p>A3</p></details>
    `;

    const state = { openFaqIndex: null as number | null };
    const trackEvent = vi.fn();

    initFaqAccordionController({
      trackEvent,
      setOpenFaqIndex: (index) => {
        state.openFaqIndex = index;
      },
      getOpenFaqIndex: () => state.openFaqIndex,
    });

    const [first, second] = Array.from(document.querySelectorAll<HTMLDetailsElement>('.faq-item'));
    expect(first).toBeDefined();
    expect(second).toBeDefined();

    first.open = true;
    first.dispatchEvent(new Event('toggle'));
    expect(trackEvent).toHaveBeenCalledWith({
      event_name: 'faq_expand',
      properties: { question_index: 0 },
    });
    expect(state.openFaqIndex).toBe(0);

    second.open = true;
    second.dispatchEvent(new Event('toggle'));
    expect(first.open).toBe(false);
    expect(state.openFaqIndex).toBe(1);
    expect(trackEvent).toHaveBeenCalledWith({
      event_name: 'faq_expand',
      properties: { question_index: 1 },
    });

    second.open = false;
    second.dispatchEvent(new Event('toggle'));
    expect(state.openFaqIndex).toBe(null);
  });
});
