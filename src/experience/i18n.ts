export type SupportedLocale = 'en-US' | 'es-US' | 'zh-CN';

export type TranslationBundle = {
  locale: SupportedLocale;
  rtl: boolean;
  labels: {
    smart_search_title: string;
    smart_search_subtitle: string;
    borough: string;
    category: string;
    max_price: string;
    starts_before: string;
    walk_distance: string;
    search_button: string;
  };
  taxonomy: {
    categories: Record<'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness', string>;
    boroughs: Record<'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island', string>;
  };
};

const bundles: Record<SupportedLocale, TranslationBundle> = {
  'en-US': {
    locale: 'en-US',
    rtl: false,
    labels: {
      smart_search_title: 'Try Smart Search for Local Events',
      smart_search_subtitle: 'Type what you want in plain language, then refine by borough or category.',
      borough: 'Borough',
      category: 'Category',
      max_price: 'Max Price (USD)',
      starts_before: 'Starts Before (Hour)',
      walk_distance: 'Walk Distance (Minutes)',
      search_button: 'Search Events',
    },
    taxonomy: {
      categories: {
        music: 'Music',
        food: 'Food',
        arts: 'Arts',
        networking: 'Networking',
        family: 'Family',
        wellness: 'Wellness',
      },
      boroughs: {
        manhattan: 'Manhattan',
        brooklyn: 'Brooklyn',
        queens: 'Queens',
        bronx: 'Bronx',
        staten_island: 'Staten Island',
      },
    },
  },
  'es-US': {
    locale: 'es-US',
    rtl: false,
    labels: {
      smart_search_title: 'Prueba Smart Search para eventos locales',
      smart_search_subtitle: 'Escribe lo que buscas y ajusta por distrito o categoria.',
      borough: 'Distrito',
      category: 'Categoria',
      max_price: 'Precio maximo (USD)',
      starts_before: 'Empieza antes (hora)',
      walk_distance: 'Distancia a pie (minutos)',
      search_button: 'Buscar eventos',
    },
    taxonomy: {
      categories: {
        music: 'Musica',
        food: 'Comida',
        arts: 'Arte',
        networking: 'Networking',
        family: 'Familia',
        wellness: 'Bienestar',
      },
      boroughs: {
        manhattan: 'Manhattan',
        brooklyn: 'Brooklyn',
        queens: 'Queens',
        bronx: 'Bronx',
        staten_island: 'Staten Island',
      },
    },
  },
  'zh-CN': {
    locale: 'zh-CN',
    rtl: false,
    labels: {
      smart_search_title: 'Shi yong zhi neng sou suo cha zhao ben di huo dong',
      smart_search_subtitle: 'Shu ru xu qiu hou ke an xing zheng qu he lei bie shai xuan.',
      borough: 'Xing zheng qu',
      category: 'Lei bie',
      max_price: 'Zui gao jia ge (USD)',
      starts_before: 'Kai shi shi jian zao yu (xiao shi)',
      walk_distance: 'Bu xing ju li (fen zhong)',
      search_button: 'Sou suo huo dong',
    },
    taxonomy: {
      categories: {
        music: 'Yin yue',
        food: 'Mei shi',
        arts: 'Yi shu',
        networking: 'She jiao',
        family: 'Jia ting',
        wellness: 'Jian kang',
      },
      boroughs: {
        manhattan: 'Man ha dun',
        brooklyn: 'Bu lu ke lin',
        queens: 'Huang hou qu',
        bronx: 'Bu lang ke si',
        staten_island: 'Shi dan dun dao',
      },
    },
  },
};

const localeAliases: Record<string, SupportedLocale> = {
  en: 'en-US',
  'en-us': 'en-US',
  es: 'es-US',
  'es-us': 'es-US',
  zh: 'zh-CN',
  'zh-cn': 'zh-CN',
};

export function resolveLocale(raw?: string): SupportedLocale {
  if (!raw?.trim()) return 'en-US';
  const normalized = raw.trim();
  if (normalized in bundles) return normalized as SupportedLocale;
  const alias = localeAliases[normalized.toLowerCase()];
  return alias ?? 'en-US';
}

export function getTranslationBundle(rawLocale?: string): {
  requested_locale?: string;
  resolved_locale: SupportedLocale;
  bundle: TranslationBundle;
} {
  const resolved_locale = resolveLocale(rawLocale);
  return {
    ...(rawLocale ? { requested_locale: rawLocale } : {}),
    resolved_locale,
    bundle: bundles[resolved_locale],
  };
}
