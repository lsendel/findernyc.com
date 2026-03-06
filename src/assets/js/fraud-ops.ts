export type FraudReviewDecision = 'cleared' | 'confirmed_fraud' | 'false_positive';

export type FraudReviewQueueItemDisplay = {
  event_id: string;
  title: string;
  risk_score: number;
  risk_band: string;
  review_route: string;
  status: 'pending' | FraudReviewDecision;
};

export type FraudOpsDashboardMetricsPayload = {
  queue_size: number;
  pending_count: number;
  high_risk_pending_count: number;
  reviewed_count: number;
  false_positive_count: number;
  false_positive_rate: number;
  outcomes: {
    cleared: number;
    confirmed_fraud: number;
    false_positive: number;
  };
};

export function renderFraudOpsDashboardMetrics(
  container: HTMLElement,
  payload: FraudOpsDashboardMetricsPayload,
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  const lines = [
    `Queue size: ${payload.queue_size}`,
    `Pending reviews: ${payload.pending_count}`,
    `High-risk pending: ${payload.high_risk_pending_count}`,
    `Reviewed items: ${payload.reviewed_count}`,
    `False positives: ${payload.false_positive_count}`,
    `False-positive rate: ${(payload.false_positive_rate * 100).toFixed(1)}%`,
    `Outcomes (cleared): ${payload.outcomes.cleared}`,
    `Outcomes (confirmed fraud): ${payload.outcomes.confirmed_fraud}`,
    `Outcomes (false positive): ${payload.outcomes.false_positive}`,
  ];
  for (const line of lines) {
    const metric = document.createElement('div');
    metric.className = 'fraud-ops-metric';
    metric.textContent = line;
    container.appendChild(metric);
  }
}

export function renderFraudReviewQueueList(
  container: HTMLElement,
  items: FraudReviewQueueItemDisplay[],
  handlers: {
    onDecision: (event_id: string, decision: FraudReviewDecision) => void;
  },
): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'saved-search-item';
    empty.textContent = 'No queue items for this filter.';
    container.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement('li');
    row.className = 'saved-search-item dashboard-manager-item';

    const details = document.createElement('span');
    details.className = 'dashboard-manager-item-meta';
    details.textContent = `${item.title} (${item.event_id}) • risk ${item.risk_band} ${item.risk_score} • route ${item.review_route} • status ${item.status}`;

    const actions = document.createElement('div');
    actions.className = 'dashboard-manager-actions';

    const decisions: FraudReviewDecision[] = ['cleared', 'confirmed_fraud', 'false_positive'];
    for (const decision of decisions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline tap-target';
      button.textContent = decision.replaceAll('_', ' ');
      button.disabled = item.status === decision;
      button.addEventListener('click', () => {
        handlers.onDecision(item.event_id, decision);
      });
      actions.appendChild(button);
    }

    row.appendChild(details);
    row.appendChild(actions);
    container.appendChild(row);
  }
}
