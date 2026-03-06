import { Hono } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';
import {
  composeInquiryProfile,
  createInquiry,
  finalizeInquiryProfile,
  getSavedInquiryProfile,
  upsertSavedInquiryProfile,
} from '../../inquiries/store';
import { getCatalogEventById } from '../../search/unified-search';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
  };
};

export const inquiriesRouter = new Hono<Env>();

const profileDraftSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().min(7).max(24).optional(),
  preferred_contact_channel: z.enum(['email', 'sms', 'phone']).optional(),
  note: z.string().max(400).optional(),
});

const createBodySchema = z.object({
  event_id: z.string().min(1).max(64),
  session_id: z.string().max(64).optional(),
  autofill_from_session: z.boolean().default(true),
  profile: profileDraftSchema.optional(),
  message: z.string().max(400).optional(),
});

function isInquiryFeatureEnabled(env: Env['Bindings']): boolean {
  return resolveFeatureFlags(env).one_click_inquiry_application;
}

inquiriesRouter.get('/profile', async (c) => {
  if (!isInquiryFeatureEnabled(c.env)) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const session_id = c.req.query('session_id')?.trim();
  if (!session_id) {
    return c.json({ success: true, profile: null }, 200);
  }

  const profile = getSavedInquiryProfile(session_id);
  return c.json({ success: true, profile: profile ?? null }, 200);
});

inquiriesRouter.post('/one-click', async (c) => {
  if (!isInquiryFeatureEnabled(c.env)) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const { event_id, session_id, profile, message, autofill_from_session } = parsed.data;
  const event = getCatalogEventById(event_id);
  if (!event) {
    return c.json({ success: false, error: 'event_not_found' }, 404);
  }

  const composedProfileDraft = composeInquiryProfile({
    session_id,
    profile,
    autofill_from_session,
  });
  const finalizedProfile = finalizeInquiryProfile(composedProfileDraft);
  if (!finalizedProfile) {
    return c.json(
      {
        success: false,
        error: 'profile_incomplete',
        profile: composedProfileDraft,
      },
      422,
    );
  }

  if (session_id) {
    upsertSavedInquiryProfile({
      session_id,
      profile: finalizedProfile,
    });
  }

  const inquiry = createInquiry({
    event_id: event.id,
    session_id,
    profile: finalizedProfile,
    message,
  });
  if (!inquiry) {
    return c.json({ success: false, error: 'event_not_found' }, 404);
  }

  return c.json(
    {
      success: true,
      inquiry,
      autofill_profile: finalizedProfile,
    },
    201,
  );
});
