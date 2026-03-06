import { Hono } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';
import { getTranslationBundle } from '../../experience/i18n';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
  };
};

export const experienceRouter = new Hono<Env>();

const accessibilityPreferenceBodySchema = z.object({
  session_id: z.string().min(2).max(64),
  high_contrast: z.boolean().optional(),
  reduced_motion: z.boolean().optional(),
  keyboard_first: z.boolean().optional(),
});

type AccessibilityPreference = {
  session_id: string;
  high_contrast: boolean;
  reduced_motion: boolean;
  keyboard_first: boolean;
  updated_at: string;
};

const preferences = new Map<string, AccessibilityPreference>();

function nowIso(): string {
  return new Date().toISOString();
}

experienceRouter.get('/i18n/:locale', (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.multi_language_ux) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const locale = c.req.param('locale');
  const resolved = getTranslationBundle(locale);
  return c.json({
    success: true,
    requested_locale: locale,
    resolved_locale: resolved.resolved_locale,
    rtl: resolved.bundle.rtl,
    labels: resolved.bundle.labels,
    taxonomy: resolved.bundle.taxonomy,
  }, 200);
});

experienceRouter.get('/i18n', (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.multi_language_ux) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const locale = c.req.query('locale');
  const resolved = getTranslationBundle(locale);
  return c.json({
    success: true,
    requested_locale: locale,
    resolved_locale: resolved.resolved_locale,
    rtl: resolved.bundle.rtl,
    labels: resolved.bundle.labels,
    taxonomy: resolved.bundle.taxonomy,
  }, 200);
});

experienceRouter.get('/accessibility/preferences/:session_id', (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.accessibility_first_mode) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const session_id = c.req.param('session_id')?.trim();
  if (!session_id) {
    return c.json({ success: false, error: 'invalid_session_id' }, 422);
  }

  const preference = preferences.get(session_id) ?? {
    session_id,
    high_contrast: true,
    reduced_motion: true,
    keyboard_first: true,
    updated_at: nowIso(),
  };

  return c.json({ success: true, preference }, 200);
});

experienceRouter.post('/accessibility/preferences', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.accessibility_first_mode) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = accessibilityPreferenceBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const previous = preferences.get(parsed.data.session_id);
  const preference: AccessibilityPreference = {
    session_id: parsed.data.session_id,
    high_contrast: parsed.data.high_contrast ?? previous?.high_contrast ?? true,
    reduced_motion: parsed.data.reduced_motion ?? previous?.reduced_motion ?? true,
    keyboard_first: parsed.data.keyboard_first ?? previous?.keyboard_first ?? true,
    updated_at: nowIso(),
  };
  preferences.set(preference.session_id, preference);

  return c.json({ success: true, preference }, 200);
});

export function __resetExperienceStateForTests(): void {
  preferences.clear();
}
