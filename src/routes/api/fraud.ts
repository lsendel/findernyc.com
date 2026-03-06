import { Hono } from 'hono';
import { z } from 'zod';
import { getFraudDashboardSlice, listFraudReviewQueue, resolveFraudReview } from '../../fraud/review-queue';
import { resolveFeatureFlags } from '../../config/feature-flags';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
  };
};

export const fraudRouter = new Hono<Env>();

const decisionSchema = z.object({
  decision: z.enum(['cleared', 'confirmed_fraud', 'false_positive']),
  reviewer: z.string().min(1).max(64).optional(),
  notes: z.string().min(1).max(255).optional(),
});

function requireFraudFeature(c: { env: Env['Bindings'] }): { ok: true } | { ok: false } {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.fraud_risk_scoring) return { ok: false };
  return { ok: true };
}

fraudRouter.get('/dashboard', (c) => {
  const gate = requireFraudFeature(c);
  if (!gate.ok) return c.json({ success: false, error: 'feature_disabled' }, 503);

  return c.json(
    {
      success: true,
      ...getFraudDashboardSlice(),
    },
    200,
  );
});

fraudRouter.get('/review-queue', (c) => {
  const gate = requireFraudFeature(c);
  if (!gate.ok) return c.json({ success: false, error: 'feature_disabled' }, 503);

  const status = c.req.query('status');
  const limitRaw = Number(c.req.query('limit') ?? '');
  const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
  const items = listFraudReviewQueue({
    status: status === 'all' || status === 'pending' || status === 'cleared' || status === 'confirmed_fraud' || status === 'false_positive'
      ? status
      : 'pending',
    limit,
  });
  return c.json({ success: true, items }, 200);
});

fraudRouter.post('/review-queue/:event_id/decision', async (c) => {
  const gate = requireFraudFeature(c);
  if (!gate.ok) return c.json({ success: false, error: 'feature_disabled' }, 503);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const eventId = c.req.param('event_id');
  const resolved = resolveFraudReview({
    event_id: eventId,
    decision: parsed.data.decision,
    reviewer: parsed.data.reviewer,
    notes: parsed.data.notes,
  });
  if (!resolved) {
    return c.json({ success: false, error: 'not_found' }, 404);
  }

  return c.json({ success: true, item: resolved }, 200);
});
