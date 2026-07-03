import type {
  SearchQuery,
  SearchResults,
  SearchSort,
  SearchSuggestions,
} from './types';

export interface DiscoveryRepository {
  search(query: SearchQuery): Promise<SearchResults>;
  suggest(query: string): Promise<SearchSuggestions>;
}

function normalizeSearchSort(value: string): SearchSort {
  if (value === 'rating' || value === 'newest') return value;
  return 'relevance';
}

function normalizeText(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function buildSearchQuery(input: {
  query?: string;
  category?: string;
  borough?: string;
  neighborhood?: string;
  sort?: string;
}): SearchQuery {
  return {
    query: normalizeText(input.query),
    category: normalizeText(input.category),
    borough: normalizeText(input.borough),
    neighborhood: normalizeText(input.neighborhood),
    sort: normalizeSearchSort(normalizeText(input.sort)),
  };
}

export class DiscoveryService {
  constructor(private readonly repository: DiscoveryRepository) {}

  async search(input: {
    query?: string;
    category?: string;
    borough?: string;
    neighborhood?: string;
    sort?: string;
  }): Promise<SearchResults> {
    return this.repository.search(buildSearchQuery(input));
  }

  async suggest(rawQuery: string | undefined): Promise<SearchSuggestions> {
    const query = normalizeText(rawQuery);
    if (query.length < 2) {
      return { spots: [], guides: [], neighborhoods: [] };
    }

    return this.repository.suggest(query);
  }
}
