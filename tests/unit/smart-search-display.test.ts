import { afterEach, describe, expect, it } from 'vitest';
import {
  formatFilterPresetSummary,
  renderAvailabilityLabel,
  renderCommuteLabel,
  renderComparePanel,
  type SmartSearchDisplayItem,
} from '../../src/assets/js/smart-search-display';

function createItem(overrides: Partial<SmartSearchDisplayItem> = {}): SmartSearchDisplayItem {
  return {
    title: 'Sample Event',
    borough: 'manhattan',
    category: 'networking',
    price: 25,
    start_hour: 19,
    walk_minutes: 15,
    relevance_score: 0.83,
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('smart search display helpers', () => {
  it('formats filter preset summary with title case and hour labels', () => {
    expect(formatFilterPresetSummary({})).toBe('No filters');
    expect(formatFilterPresetSummary({
      borough: 'queens',
      category: 'family',
      max_price: 60,
      starts_before_hour: 18,
      within_walk_minutes: 25,
    })).toBe('Borough: Queens • Category: Family • Max $60 • Before 6:00 PM • Walk ≤ 25m');
  });

  it('renders availability and commute labels with personalization context', () => {
    expect(renderAvailabilityLabel(createItem({ availability: { status: 'available', seats_remaining: 12 } }))).toBe('12 spots available');
    expect(renderAvailabilityLabel(createItem({ availability: { status: 'limited', seats_remaining: 3 } }))).toBe('3 spots left');
    expect(renderAvailabilityLabel(createItem({ availability: { status: 'sold_out' } }))).toBe('Sold out');

    expect(renderCommuteLabel(createItem({
      commute: {
        eta_minutes: 18,
        band: 'good',
        mode: 'multi_leg',
        personalized: true,
        origin_borough: 'brooklyn',
      },
    }))).toBe('Est. commute 18 min from Brooklyn (good, multi-leg)');
  });

  it('renders compare panel summaries and cards from compared events', () => {
    document.body.innerHTML = `
      <section id="panel" hidden>
        <p id="summary"></p>
        <div id="grid"></div>
      </section>
    `;

    const panel = document.getElementById('panel') as HTMLElement;
    const summary = document.getElementById('summary') as HTMLElement;
    const grid = document.getElementById('grid') as HTMLElement;

    const events: SmartSearchDisplayItem[] = [
      createItem({
        title: 'Event A',
        price: 60,
        start_hour: 20,
        walk_minutes: 14,
      }),
      createItem({
        title: 'Event B',
        price: 40,
        start_hour: 18,
        walk_minutes: 11,
        price_breakdown: { total_price: 75 },
      }),
      createItem({
        title: 'Event C',
        price: 80,
        start_hour: 21,
        walk_minutes: 8,
        price_breakdown: { total_price: 35 },
        commute: {
          eta_minutes: 22,
          band: 'fair',
          mode: 'subway',
          personalized: false,
        },
        best_value: {
          band: 'excellent',
          score: 91,
        },
      }),
    ];

    renderComparePanel(panel, summary, grid, events);

    expect(panel.hidden).toBe(false);
    expect(summary.textContent).toBe('Cheapest: Event C • Earliest: Event B • Shortest walk: Event C');
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.smart-search-compare-card'));
    expect(cards).toHaveLength(3);
    expect(cards[2]?.textContent).toContain('Estimated total: $35.00');
    expect(cards[2]?.textContent).toContain('Commute: 22 min');
    expect(cards[2]?.textContent).toContain('Best value: excellent (91)');

    renderComparePanel(panel, summary, grid, [events[0]!]);
    expect(summary.textContent).toBe('Select at least two events to compare side by side.');

    renderComparePanel(panel, summary, grid, []);
    expect(panel.hidden).toBe(true);
    expect(summary.textContent).toBe('');
  });
});
