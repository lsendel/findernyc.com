export const boroughValues = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island'] as const;
export type Borough = (typeof boroughValues)[number];

export const categoryValues = ['music', 'food', 'arts', 'networking', 'family', 'wellness'] as const;
export type EventCategory = (typeof categoryValues)[number];

export type SearchFilters = {
  borough?: Borough;
  category?: EventCategory;
  max_price?: number;
  starts_before_hour?: number;
  within_walk_minutes?: number;
};

export type SearchAvailability = {
  status: 'available' | 'limited' | 'sold_out';
  seats_total?: number;
  seats_remaining?: number;
  updated_at: string;
};

export type SearchEvent = {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  borough: Borough;
  category: EventCategory;
  price: number;
  start_hour: number;
  walk_minutes: number;
  venue: string;
};

export type SearchResult = SearchEvent & {
  relevance_score: number;
  availability?: SearchAvailability;
};

export type SearchRankingWeights = {
  title_term_match: number;
  description_term_match: number;
  exact_phrase_match: number;
  borough_match: number;
  category_match: number;
  price_affinity: number;
  walk_affinity: number;
  time_affinity: number;
  behavioral_category_boost: number;
  behavioral_borough_boost: number;
  behavioral_event_boost: number;
};

export type SearchBehavioralBoosts = {
  categories?: Partial<Record<EventCategory, number>>;
  boroughs?: Partial<Record<Borough, number>>;
  events?: Record<string, number>;
};

export const defaultSearchRankingWeights: SearchRankingWeights = {
  title_term_match: 2.4,
  description_term_match: 1.2,
  exact_phrase_match: 3.2,
  borough_match: 2.2,
  category_match: 2.0,
  price_affinity: 1.8,
  walk_affinity: 1.3,
  time_affinity: 1.0,
  behavioral_category_boost: 1.1,
  behavioral_borough_boost: 0.9,
  behavioral_event_boost: 1.5,
};

const CATALOG: SearchEvent[] = [
  {
    id: 'evt_001',
    organizer_id: 'org_bedford_sessions',
    title: 'Brooklyn Free Jazz Night',
    description: 'Live jazz session with rotating local musicians.',
    borough: 'brooklyn',
    category: 'music',
    price: 0,
    start_hour: 20,
    walk_minutes: 8,
    venue: 'Bedford Room',
  },
  {
    id: 'evt_002',
    organizer_id: 'org_midtown_founders',
    title: 'Sunset Rooftop Networking Mixer',
    description: 'Startup founders and product operators networking meetup.',
    borough: 'manhattan',
    category: 'networking',
    price: 25,
    start_hour: 19,
    walk_minutes: 11,
    venue: 'Midtown Rooftop Hub',
  },
  {
    id: 'evt_003',
    organizer_id: 'org_market_collective',
    title: 'Queens Night Market Food Crawl',
    description: 'Street food vendors and chef pop-ups from across NYC.',
    borough: 'queens',
    category: 'food',
    price: 10,
    start_hour: 18,
    walk_minutes: 14,
    venue: 'Flushing Commons',
  },
  {
    id: 'evt_004',
    organizer_id: 'org_bronx_arts_alliance',
    title: 'Bronx Family Arts Workshop',
    description: 'Hands-on mural and collage activity for families.',
    borough: 'bronx',
    category: 'family',
    price: 15,
    start_hour: 13,
    walk_minutes: 20,
    venue: 'Bronx Creative Lab',
  },
  {
    id: 'evt_005',
    organizer_id: 'org_hudson_wellness',
    title: 'Downtown Wellness Run Club',
    description: 'Group run and stretch session with recovery coaching.',
    borough: 'manhattan',
    category: 'wellness',
    price: 0,
    start_hour: 7,
    walk_minutes: 9,
    venue: 'Hudson Pier Track',
  },
  {
    id: 'evt_006',
    organizer_id: 'org_northside_gallery',
    title: 'Williamsburg Indie Art Showcase',
    description: 'Local painters, photography exhibits, and live sketching.',
    borough: 'brooklyn',
    category: 'arts',
    price: 12,
    start_hour: 17,
    walk_minutes: 6,
    venue: 'Northside Loft Gallery',
  },
];

const CATALOG_BY_ID: Record<string, SearchEvent> = Object.fromEntries(
  CATALOG.map((event) => [event.id, event]),
) as Record<string, SearchEvent>;

const BOROUGH_ALIASES: Record<Borough, string[]> = {
  manhattan: ['manhattan', 'midtown', 'downtown'],
  brooklyn: ['brooklyn', 'williamsburg', 'bushwick'],
  queens: ['queens', 'astoria', 'flushing'],
  bronx: ['bronx'],
  staten_island: ['staten island', 'staten_island'],
};

const CATEGORY_ALIASES: Record<EventCategory, string[]> = {
  music: ['music', 'jazz', 'concert', 'gig'],
  food: ['food', 'dinner', 'brunch', 'market'],
  arts: ['art', 'arts', 'gallery', 'museum'],
  networking: ['networking', 'founder', 'startup', 'meetup'],
  family: ['family', 'kids', 'children'],
  wellness: ['wellness', 'fitness', 'run', 'yoga'],
};

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'for',
  'in',
  'near',
  'with',
  'to',
  'on',
  'at',
  'and',
  'events',
  'event',
  'tonight',
  'this',
  'weekend',
  'me',
]);

function normalize(input: string): string {
  return input.trim().toLowerCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/[^a-z0-9_]+/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && !STOP_WORDS.has(part));
}

function parseMaxPrice(query: string): number | undefined {
  const normalized = normalize(query);
  if (/\bfree\b/.test(normalized)) return 0;

  const underMatch = normalized.match(/\b(?:under|below|<=?)\s*\$?\s*(\d{1,4})\b/);
  if (underMatch) return Number(underMatch[1]);

  const dollarsMatch = normalized.match(/\$(\d{1,4})/);
  if (dollarsMatch) return Number(dollarsMatch[1]);

  return undefined;
}

function parseBorough(query: string): Borough | undefined {
  const normalized = normalize(query);
  for (const borough of boroughValues) {
    const aliases = BOROUGH_ALIASES[borough];
    if (aliases.some((alias) => normalized.includes(alias))) {
      return borough;
    }
  }
  return undefined;
}

function parseCategory(query: string): EventCategory | undefined {
  const normalized = normalize(query);
  for (const category of categoryValues) {
    const aliases = CATEGORY_ALIASES[category];
    if (aliases.some((alias) => normalized.includes(alias))) {
      return category;
    }
  }
  return undefined;
}

function matchesFilters(event: SearchEvent, filters: SearchFilters): boolean {
  if (filters.borough && event.borough !== filters.borough) return false;
  if (filters.category && event.category !== filters.category) return false;
  if (typeof filters.max_price === 'number' && event.price > filters.max_price) return false;
  if (typeof filters.starts_before_hour === 'number' && event.start_hour > filters.starts_before_hour) return false;
  if (typeof filters.within_walk_minutes === 'number' && event.walk_minutes > filters.within_walk_minutes) return false;
  return true;
}

function scoreEvent(
  event: SearchEvent,
  query: string,
  queryTerms: string[],
  filters: SearchFilters,
  weights: SearchRankingWeights,
  behavioralBoosts?: SearchBehavioralBoosts,
  availability?: SearchAvailability,
): number {
  let score = 0;
  const normalizedQuery = normalize(query);
  const normalizedTitle = event.title.toLowerCase();
  const normalizedDescription = event.description.toLowerCase();
  const haystack = `${normalizedTitle} ${normalizedDescription}`;

  for (const term of queryTerms) {
    if (normalizedTitle.includes(term)) score += weights.title_term_match;
    if (normalizedDescription.includes(term)) score += weights.description_term_match;
  }

  if (normalizedQuery.length >= 3 && haystack.includes(normalizedQuery)) {
    score += weights.exact_phrase_match;
  }

  if (filters.borough && filters.borough === event.borough) score += weights.borough_match;
  if (filters.category && filters.category === event.category) score += weights.category_match;
  if (typeof filters.max_price === 'number') {
    score += weights.price_affinity * Math.max(0, 1 - event.price / Math.max(1, filters.max_price + 1));
  }
  score += weights.walk_affinity * Math.max(0, 1.2 - event.walk_minutes / 20);
  score += weights.time_affinity * Math.max(0, 1.2 - event.start_hour / 24);

  const categoryBoostRaw = behavioralBoosts?.categories?.[event.category] ?? 0;
  const boroughBoostRaw = behavioralBoosts?.boroughs?.[event.borough] ?? 0;
  const eventBoostRaw = behavioralBoosts?.events?.[event.id] ?? 0;

  score += weights.behavioral_category_boost * clamp(categoryBoostRaw, -2, 4);
  score += weights.behavioral_borough_boost * clamp(boroughBoostRaw, -2, 4);
  score += weights.behavioral_event_boost * clamp(eventBoostRaw, -2, 4);

  if (availability?.status === 'available') score += 0.8;
  if (availability?.status === 'limited') score += 0.2;
  if (availability?.status === 'sold_out') score -= 1.6;

  return score;
}

export function parseSearchIntent(query: string): SearchFilters {
  return {
    borough: parseBorough(query),
    category: parseCategory(query),
    max_price: parseMaxPrice(query),
  };
}

export function runUnifiedSmartSearch(input: {
  query: string;
  filters?: SearchFilters;
  limit: number;
  ranking?: {
    weights?: Partial<SearchRankingWeights>;
    behavioral_boosts?: SearchBehavioralBoosts;
  };
  availability?: Record<string, SearchAvailability>;
}): {
  inferred_filters: SearchFilters;
  applied_filters: SearchFilters;
  results: SearchResult[];
  total: number;
} {
  const inferredFilters = parseSearchIntent(input.query);
  const appliedFilters: SearchFilters = {
    ...inferredFilters,
    ...(input.filters ?? {}),
  };
  const rankingWeights: SearchRankingWeights = {
    ...defaultSearchRankingWeights,
    ...(input.ranking?.weights ?? {}),
  };

  const queryTerms = tokenize(input.query);
  const results = CATALOG
    .filter((event) => matchesFilters(event, appliedFilters))
    .map((event) => {
      const availability = input.availability?.[event.id];
      return {
        ...event,
        relevance_score: Number(
          scoreEvent(
            event,
            input.query,
            queryTerms,
            appliedFilters,
            rankingWeights,
            input.ranking?.behavioral_boosts,
            availability,
          ).toFixed(4),
        ),
        ...(availability ? { availability } : {}),
      };
    })
    .sort((a, b) => b.relevance_score - a.relevance_score || a.start_hour - b.start_hour)
    .slice(0, input.limit);

  return {
    inferred_filters: inferredFilters,
    applied_filters: appliedFilters,
    results,
    total: results.length,
  };
}

export function getCatalogEventById(eventId: string): SearchEvent | undefined {
  return CATALOG_BY_ID[eventId];
}
