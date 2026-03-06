export type SmartSearchFiltersSummary = {
  borough?: string;
  category?: string;
  max_price?: number;
  starts_before_hour?: number;
  within_walk_minutes?: number;
};

type SmartSearchAvailability = {
  status: 'available' | 'limited' | 'sold_out';
  seats_remaining?: number;
};

type SmartSearchCommute = {
  eta_minutes: number;
  band: string;
  mode: 'walk' | 'subway' | 'multi_leg';
  personalized: boolean;
  origin_borough?: string;
};

type SmartSearchNeighborhoodFit = {
  score: number;
  band: string;
  dominant_vibe: string;
};

type SmartSearchBestValue = {
  score: number;
  band: string;
};

type SmartSearchPersonalization = {
  boost: number;
  personalized: boolean;
};

type SmartSearchVerification = {
  status: 'verified' | 'pending' | 'unverified';
  badge_label: string;
  trust_score: number;
};

type SmartSearchFraudRisk = {
  score: number;
  band: string;
  review_route: string;
  reasons: string[];
};

type SmartSearchReviewAuthenticity = {
  score: number;
  band: string;
  review_count: number;
  visible_review_count: number;
  suppressed_review_count: number;
};

type SmartSearchPriceBreakdown = {
  total_price: number;
};

export type SmartSearchDisplayItem = {
  title: string;
  borough: string;
  category: string;
  price: number;
  start_hour: number;
  walk_minutes: number;
  relevance_score: number;
  availability?: SmartSearchAvailability;
  commute?: SmartSearchCommute;
  neighborhood_fit?: SmartSearchNeighborhoodFit;
  best_value?: SmartSearchBestValue;
  personalization?: SmartSearchPersonalization;
  verification?: SmartSearchVerification;
  fraud_risk?: SmartSearchFraudRisk;
  review_authenticity?: SmartSearchReviewAuthenticity;
  price_breakdown?: SmartSearchPriceBreakdown;
};

export function formatStartHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export function titleCase(value: string): string {
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function renderAvailabilityLabel(item: SmartSearchDisplayItem): string | null {
  const availability = item.availability;
  if (!availability) return null;

  if (availability.status === 'sold_out') return 'Sold out';
  if (availability.status === 'limited') {
    if (typeof availability.seats_remaining === 'number') {
      return `${availability.seats_remaining} spots left`;
    }
    return 'Limited seats';
  }
  if (typeof availability.seats_remaining === 'number') {
    return `${availability.seats_remaining} spots available`;
  }
  return 'Available';
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function renderCommuteLabel(item: SmartSearchDisplayItem): string | null {
  if (!item.commute) return null;
  const mode = item.commute.mode === 'multi_leg' ? 'multi-leg' : item.commute.mode;
  if (item.commute.personalized && item.commute.origin_borough) {
    return `Est. commute ${item.commute.eta_minutes} min from ${titleCase(item.commute.origin_borough)} (${item.commute.band}, ${mode})`;
  }
  return `Est. commute ${item.commute.eta_minutes} min (${item.commute.band}, ${mode})`;
}

export function renderNeighborhoodFitLabel(item: SmartSearchDisplayItem): string | null {
  if (!item.neighborhood_fit) return null;
  const fitBand = titleCase(item.neighborhood_fit.band);
  const dominantVibe = titleCase(item.neighborhood_fit.dominant_vibe);
  return `Neighborhood fit ${fitBand} (${item.neighborhood_fit.score}) • ${dominantVibe}`;
}

export function renderBestValueLabel(item: SmartSearchDisplayItem): string | null {
  if (!item.best_value) return null;
  const band = titleCase(item.best_value.band);
  return `Best value ${band} (${item.best_value.score})`;
}

export function renderPersonalizationLabel(item: SmartSearchDisplayItem): string | null {
  if (!item.personalization?.personalized) return null;
  return `Personalized boost +${item.personalization.boost.toFixed(1)}`;
}

export function renderVerificationLabel(item: SmartSearchDisplayItem): string | null {
  if (!item.verification) return null;
  const trustScore = Math.round(item.verification.trust_score);
  return `${item.verification.badge_label} (Trust ${trustScore})`;
}

export function renderFraudRiskLabel(item: SmartSearchDisplayItem): string | null {
  if (!item.fraud_risk) return null;
  const reasons = item.fraud_risk.reasons.length > 0 ? ` — ${item.fraud_risk.reasons.join(' ')}` : '';
  return `Fraud risk ${titleCase(item.fraud_risk.band)} (${item.fraud_risk.score}) • Route: ${titleCase(item.fraud_risk.review_route)}${reasons}`;
}

export function renderReviewAuthenticityLabel(item: SmartSearchDisplayItem): string | null {
  if (!item.review_authenticity) return null;
  const summary = `${item.review_authenticity.visible_review_count}/${item.review_authenticity.review_count} visible`;
  const suppression = item.review_authenticity.suppressed_review_count > 0
    ? ` • ${item.review_authenticity.suppressed_review_count} suppressed`
    : '';
  return `Review authenticity ${titleCase(item.review_authenticity.band)} (${item.review_authenticity.score}) • ${summary}${suppression}`;
}

export function formatFilterPresetSummary(filters: SmartSearchFiltersSummary): string {
  const parts: string[] = [];
  if (filters.borough) parts.push(`Borough: ${titleCase(filters.borough)}`);
  if (filters.category) parts.push(`Category: ${titleCase(filters.category)}`);
  if (typeof filters.max_price === 'number') parts.push(`Max $${filters.max_price}`);
  if (typeof filters.starts_before_hour === 'number') parts.push(`Before ${formatStartHour(filters.starts_before_hour)}`);
  if (typeof filters.within_walk_minutes === 'number') parts.push(`Walk ≤ ${filters.within_walk_minutes}m`);
  if (parts.length === 0) return 'No filters';
  return parts.join(' • ');
}

export function renderComparePanel(
  panel: HTMLElement,
  summary: HTMLElement,
  grid: HTMLElement,
  compared: SmartSearchDisplayItem[],
): void {
  while (grid.firstChild) grid.removeChild(grid.firstChild);

  if (compared.length === 0) {
    panel.hidden = true;
    summary.textContent = '';
    return;
  }

  panel.hidden = false;
  if (compared.length < 2) {
    summary.textContent = 'Select at least two events to compare side by side.';
  } else {
    const cheapest = compared.reduce((best, current) => {
      const bestCost = best.price_breakdown?.total_price ?? best.price;
      const currentCost = current.price_breakdown?.total_price ?? current.price;
      return currentCost < bestCost ? current : best;
    });
    const earliest = compared.reduce((best, current) => (current.start_hour < best.start_hour ? current : best));
    const shortestWalk = compared.reduce((best, current) => (current.walk_minutes < best.walk_minutes ? current : best));
    summary.textContent = `Cheapest: ${cheapest.title} • Earliest: ${earliest.title} • Shortest walk: ${shortestWalk.title}`;
  }

  for (const event of compared) {
    const card = document.createElement('article');
    card.className = 'smart-search-compare-card';

    const title = document.createElement('h4');
    title.textContent = event.title;
    card.appendChild(title);

    const detailLines = [
      `${titleCase(event.borough)} • ${titleCase(event.category)}`,
      `Price: ${event.price === 0 ? 'Free' : `$${event.price}`}`,
      `Start: ${formatStartHour(event.start_hour)}`,
      `Walk: ${event.walk_minutes} min`,
      `Relevance: ${event.relevance_score.toFixed(2)}`,
      ...(typeof event.price_breakdown?.total_price === 'number'
        ? [`Estimated total: ${formatUsd(event.price_breakdown.total_price)}`]
        : []),
      ...(typeof event.commute?.eta_minutes === 'number'
        ? [`Commute: ${event.commute.eta_minutes} min`]
        : []),
      ...(typeof event.best_value?.score === 'number'
        ? [`Best value: ${event.best_value.band} (${event.best_value.score})`]
        : []),
    ];
    for (const line of detailLines) {
      const p = document.createElement('p');
      p.textContent = line;
      card.appendChild(p);
    }
    grid.appendChild(card);
  }
}
