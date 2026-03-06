import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultRuntimeAnalyticsConfig,
  forwardAnalyticsToProviders,
  parseRuntimeAnalyticsConfig,
} from '../../src/assets/js/analytics-runtime';

describe('analytics-runtime', () => {
  const originalGtag = window.gtag;
  const originalAnalytics = window.analytics;

  afterEach(() => {
    window.gtag = originalGtag;
    window.analytics = originalAnalytics;
  });

  it('returns disabled defaults when payload is missing', () => {
    expect(parseRuntimeAnalyticsConfig(undefined)).toEqual(createDefaultRuntimeAnalyticsConfig());
    expect(parseRuntimeAnalyticsConfig(null)).toEqual(createDefaultRuntimeAnalyticsConfig());
  });

  it('normalizes analytics ids and provider booleans', () => {
    const config = parseRuntimeAnalyticsConfig({
      ga4_measurement_id: '  G-TEST12345  ',
      segment_write_key: '  seg_abc123  ',
      providers: {
        ga4: false,
      },
    });

    expect(config.ga4_measurement_id).toBe('G-TEST12345');
    expect(config.segment_write_key).toBe('seg_abc123');
    expect(config.providers.ga4).toBe(false);
    expect(config.providers.segment).toBe(true);
  });

  it('forwards events to enabled providers', () => {
    const gtag = vi.fn();
    const segmentTrack = vi.fn();
    window.gtag = gtag;
    window.analytics = { track: segmentTrack };

    forwardAnalyticsToProviders(
      {
        providers: {
          ga4: true,
          segment: true,
        },
      },
      {
        event_name: 'cta_click',
        properties: {
          cta_label: 'find-events-hero',
          section: 'hero',
        },
        session_id: 'sess_123',
      },
    );

    expect(gtag).toHaveBeenCalledWith(
      'event',
      'cta_click',
      expect.objectContaining({
        cta_label: 'find-events-hero',
        section: 'hero',
        session_id: 'sess_123',
      }),
    );
    expect(segmentTrack).toHaveBeenCalledWith(
      'cta_click',
      expect.objectContaining({
        cta_label: 'find-events-hero',
        section: 'hero',
        session_id: 'sess_123',
      }),
    );
  });

  it('does not forward when providers are disabled', () => {
    const gtag = vi.fn();
    const segmentTrack = vi.fn();
    window.gtag = gtag;
    window.analytics = { track: segmentTrack };

    forwardAnalyticsToProviders(
      {
        providers: {
          ga4: false,
          segment: false,
        },
      },
      {
        event_name: 'section_view',
        properties: {
          section_name: 'hero',
        },
      },
    );

    expect(gtag).not.toHaveBeenCalled();
    expect(segmentTrack).not.toHaveBeenCalled();
  });
});
