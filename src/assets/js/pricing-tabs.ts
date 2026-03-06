type PricingTab = 'consumer' | 'business';

type PricingTabViewEventPayload = {
  event_name: 'pricing_tab_view';
  properties: {
    tab_name: PricingTab;
  } & Record<string, unknown>;
  session_id?: string;
};

type InitPricingTabsOptions = {
  trackEvent: (payload: PricingTabViewEventPayload) => Promise<void> | void;
  setActivePricingTab: (tab: PricingTab) => void;
};

export function initPricingTabsController(options: InitPricingTabsOptions): void {
  const tabBtns = Array.from(document.querySelectorAll<HTMLButtonElement>('.pricing-tab-btn'));

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab as PricingTab;
      if (!tab) return;

      const otherTab = tab === 'consumer' ? 'business' : 'consumer';

      const activeSection = document.getElementById(`pricing-${tab}`);
      const inactiveSection = document.getElementById(`pricing-${otherTab}`);

      if (activeSection) activeSection.removeAttribute('hidden');
      if (inactiveSection) inactiveSection.setAttribute('hidden', '');

      tabBtns.forEach((candidate) => candidate.classList.remove('is-active'));
      btn.classList.add('is-active');

      options.setActivePricingTab(tab);

      void options.trackEvent({
        event_name: 'pricing_tab_view',
        properties: { tab_name: tab },
      });
    });
  });
}
