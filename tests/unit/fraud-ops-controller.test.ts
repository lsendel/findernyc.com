import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  renderFraudOpsDashboardMetrics,
  renderFraudReviewQueueList,
} from '../../src/assets/js/fraud-ops';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('fraud ops render helpers', () => {
  it('renders dashboard metrics rows', () => {
    document.body.innerHTML = '<div id="metrics"><p>stale</p></div>';
    const metrics = document.getElementById('metrics') as HTMLElement;

    renderFraudOpsDashboardMetrics(metrics, {
      queue_size: 11,
      pending_count: 7,
      high_risk_pending_count: 2,
      reviewed_count: 24,
      false_positive_count: 3,
      false_positive_rate: 0.125,
      outcomes: {
        cleared: 12,
        confirmed_fraud: 9,
        false_positive: 3,
      },
    });

    const rows = Array.from(metrics.querySelectorAll<HTMLElement>('.fraud-ops-metric'));
    expect(rows).toHaveLength(9);
    expect(rows[0]?.textContent).toBe('Queue size: 11');
    expect(rows[5]?.textContent).toBe('False-positive rate: 12.5%');
    expect(rows[8]?.textContent).toBe('Outcomes (false positive): 3');
  });

  it('renders an empty queue message when no items exist', () => {
    document.body.innerHTML = '<ul id="list"></ul>';
    const list = document.getElementById('list') as HTMLElement;

    renderFraudReviewQueueList(list, [], {
      onDecision: vi.fn(),
    });

    expect(list.children).toHaveLength(1);
    expect(list.textContent).toContain('No queue items for this filter.');
  });

  it('renders queue actions and dispatches decision callbacks', () => {
    document.body.innerHTML = '<ul id="list"></ul>';
    const list = document.getElementById('list') as HTMLElement;
    const onDecision = vi.fn();

    renderFraudReviewQueueList(list, [{
      event_id: 'evt_123',
      title: 'Questionable Listing',
      risk_score: 91,
      risk_band: 'high',
      review_route: 'review_queue',
      status: 'confirmed_fraud',
    }], {
      onDecision,
    });

    const row = list.querySelector<HTMLElement>('li.dashboard-manager-item');
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('Questionable Listing (evt_123)');

    const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons).toHaveLength(3);

    const confirmedFraud = buttons.find((button) => button.textContent === 'confirmed fraud');
    const cleared = buttons.find((button) => button.textContent === 'cleared');
    expect(confirmedFraud?.disabled).toBe(true);
    expect(cleared?.disabled).toBe(false);

    cleared?.click();
    expect(onDecision).toHaveBeenCalledWith('evt_123', 'cleared');
  });
});
