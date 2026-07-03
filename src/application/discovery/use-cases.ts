import { buildSearchQuery } from '../../domain/discovery/service';
import type { DiscoveryService } from '../../domain/discovery/service';
import type { SearchResults, SearchSuggestions } from '../../domain/discovery/types';
import { presentSearchPage, type SearchPageViewModel } from './presenters';

export type SearchInput = {
  query?: string;
  category?: string;
  borough?: string;
  neighborhood?: string;
  sort?: string;
};

export async function searchFinderNyc(
  service: DiscoveryService,
  input: SearchInput,
): Promise<SearchResults> {
  return service.search(input);
}

export async function buildSearchPageModel(
  service: DiscoveryService | null,
  input: SearchInput,
): Promise<SearchPageViewModel> {
  const normalized = buildSearchQuery(input);
  if (!service) {
    return presentSearchPage(normalized, { spots: [], guides: [], total: 0 });
  }

  return presentSearchPage(normalized, await service.search(normalized));
}

export async function suggestFinderNyc(
  service: DiscoveryService,
  query: string | undefined,
): Promise<SearchSuggestions> {
  return service.suggest(query);
}
