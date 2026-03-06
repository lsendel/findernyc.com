import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index';
import { __resetExperienceStateForTests } from '../../src/routes/api/experience';

describe('Experience API routes (week 21)', () => {
  beforeEach(() => {
    __resetExperienceStateForTests();
  });

  it('returns 503 for i18n when multi_language_ux is disabled', async () => {
    const res = await app.request('/api/experience/i18n/es-US', { method: 'GET' });
    expect(res.status).toBe(503);
    const body = await res.json() as { success: boolean; error: string };
    expect(body.success).toBe(false);
    expect(body.error).toBe('feature_disabled');
  });

  it('returns translated taxonomy labels when enabled', async () => {
    const res = await app.request('/api/experience/i18n/es-US', { method: 'GET' }, { FEATURE_FLAGS: 'multi_language_ux' });
    expect(res.status).toBe(200);

    const body = await res.json() as {
      success: boolean;
      resolved_locale: string;
      taxonomy: { categories: { music: string; food: string } };
      labels: { search_button: string };
    };
    expect(body.success).toBe(true);
    expect(body.resolved_locale).toBe('es-US');
    expect(body.taxonomy.categories.music).toBe('Musica');
    expect(body.labels.search_button).toBe('Buscar eventos');
  });

  it('stores and retrieves accessibility preferences when accessibility_first_mode is enabled', async () => {
    const save = await app.request(
      '/api/experience/accessibility/preferences',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'sess-a11y-1',
          high_contrast: true,
          reduced_motion: false,
          keyboard_first: true,
        }),
      },
      { FEATURE_FLAGS: 'accessibility_first_mode' },
    );

    expect(save.status).toBe(200);

    const fetchSaved = await app.request(
      '/api/experience/accessibility/preferences/sess-a11y-1',
      { method: 'GET' },
      { FEATURE_FLAGS: 'accessibility_first_mode' },
    );

    expect(fetchSaved.status).toBe(200);
    const body = await fetchSaved.json() as {
      success: boolean;
      preference: {
        high_contrast: boolean;
        reduced_motion: boolean;
        keyboard_first: boolean;
      };
    };
    expect(body.success).toBe(true);
    expect(body.preference.high_contrast).toBe(true);
    expect(body.preference.reduced_motion).toBe(false);
    expect(body.preference.keyboard_first).toBe(true);
  });

  it('returns 503 for accessibility preferences when feature is disabled', async () => {
    const res = await app.request('/api/experience/accessibility/preferences/sess-a11y-2', { method: 'GET' });
    expect(res.status).toBe(503);
  });

  it('returns 422 on invalid accessibility preference payload', async () => {
    const res = await app.request(
      '/api/experience/accessibility/preferences',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          high_contrast: true,
        }),
      },
      { FEATURE_FLAGS: 'accessibility_first_mode' },
    );
    expect(res.status).toBe(422);
  });
});
