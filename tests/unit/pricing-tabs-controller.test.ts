import { afterEach, describe, expect, it, vi } from 'vitest';
import { initPricingTabsController } from '../../src/assets/js/pricing-tabs';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('pricing tabs controller', () => {
  it('switches active tab panels and tracks pricing_tab_view', () => {
    document.body.innerHTML = `
      <button class="pricing-tab-btn is-active" data-tab="consumer" type="button">Consumer</button>
      <button class="pricing-tab-btn" data-tab="business" type="button">Business</button>
      <section id="pricing-consumer"></section>
      <section id="pricing-business" hidden></section>
    `;

    const trackEvent = vi.fn();
    const setActivePricingTab = vi.fn();

    initPricingTabsController({
      trackEvent,
      setActivePricingTab,
    });

    const businessTab = document.querySelector<HTMLButtonElement>('.pricing-tab-btn[data-tab="business"]');
    const consumerSection = document.getElementById('pricing-consumer');
    const businessSection = document.getElementById('pricing-business');
    expect(businessTab).not.toBeNull();

    businessTab!.click();

    expect(setActivePricingTab).toHaveBeenCalledWith('business');
    expect(trackEvent).toHaveBeenCalledWith({
      event_name: 'pricing_tab_view',
      properties: { tab_name: 'business' },
    });
    expect(consumerSection?.hasAttribute('hidden')).toBe(true);
    expect(businessSection?.hasAttribute('hidden')).toBe(false);
    expect(businessTab?.classList.contains('is-active')).toBe(true);
  });
});
