import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';
import { availabilityStatusValues, upsertAvailabilityUpdates } from '../../availability/store';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
    EVENT_AVAILABILITY_JSON?: string;
    INVENTORY_WEBHOOK_TOKEN?: string;
  };
};

export const availabilityRouter = new Hono<Env>();
type AvailabilityContext = Context<Env>;

const syncUpdateSchema = z.object({
  event_id: z.string().min(1).max(64),
  status: z.enum(availabilityStatusValues).optional(),
  seats_total: z.number().int().positive().optional(),
  seats_remaining: z.number().int().nonnegative().optional(),
  updated_at: z.string().optional(),
}).superRefine((value, ctx) => {
  if (
    typeof value.seats_total === 'number'
    && typeof value.seats_remaining === 'number'
    && value.seats_remaining > value.seats_total
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'seats_remaining_must_not_exceed_seats_total',
      path: ['seats_remaining'],
    });
  }

  if (
    !value.status
    && typeof value.seats_total !== 'number'
    && typeof value.seats_remaining !== 'number'
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'status_or_seat_counts_required',
      path: ['status'],
    });
  }
});

const syncBodySchema = z.object({
  updates: z.array(syncUpdateSchema).min(1).max(100),
});

const webhookRecordSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  event_id: z.string().min(1).max(64).optional(),
  status: z.enum(availabilityStatusValues).optional(),
  availability: z.enum(availabilityStatusValues).optional(),
  seats_total: z.number().int().positive().optional(),
  seats_remaining: z.number().int().nonnegative().optional(),
  seats: z.object({
    total: z.number().int().positive().optional(),
    remaining: z.number().int().nonnegative().optional(),
  }).optional(),
  updated_at: z.string().optional(),
}).superRefine((value, ctx) => {
  const eventId = value.event_id ?? value.id;
  if (!eventId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'event_id_required',
      path: ['event_id'],
    });
  }

  const seatsTotal = value.seats?.total ?? value.seats_total;
  const seatsRemaining = value.seats?.remaining ?? value.seats_remaining;
  if (
    typeof seatsTotal === 'number'
    && typeof seatsRemaining === 'number'
    && seatsRemaining > seatsTotal
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'seats_remaining_must_not_exceed_seats_total',
      path: ['seats_remaining'],
    });
  }

  const status = value.status ?? value.availability;
  if (!status && typeof seatsTotal !== 'number' && typeof seatsRemaining !== 'number') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'status_or_seat_counts_required',
      path: ['status'],
    });
  }
});

const webhookBodySchema = z.object({
  records: z.array(webhookRecordSchema).min(1).max(500),
  sent_at: z.string().optional(),
});

function extractWebhookToken(c: AvailabilityContext): string {
  const bearer = c.req.header('authorization');
  if (typeof bearer === 'string' && bearer.toLowerCase().startsWith('bearer ')) {
    return bearer.slice(7).trim();
  }
  return (c.req.header('x-inventory-token') ?? '').trim();
}

function hasValidWebhookToken(c: AvailabilityContext): {
  valid: boolean;
  error?: string;
} {
  const expected = c.env.INVENTORY_WEBHOOK_TOKEN?.trim();
  if (!expected) {
    return { valid: false, error: 'webhook_token_not_configured' };
  }
  const provided = extractWebhookToken(c);
  if (!provided || provided !== expected) {
    return { valid: false, error: 'unauthorized_webhook' };
  }
  return { valid: true };
}

availabilityRouter.post('/sync', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.realtime_availability_sync) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = syncBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const items = upsertAvailabilityUpdates(parsed.data.updates);
  return c.json({
    success: true,
    processed: items.length,
    items: items.map((item) => ({
      event_id: item.event_id,
      status: item.status,
      seats_total: item.seats_total,
      seats_remaining: item.seats_remaining,
      updated_at: item.updated_at,
    })),
  }, 200);
});

availabilityRouter.post('/webhook/:provider', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.realtime_availability_sync) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const auth = hasValidWebhookToken(c);
  if (!auth.valid) {
    if (auth.error === 'webhook_token_not_configured') {
      return c.json({ success: false, error: auth.error }, 503);
    }
    return c.json({ success: false, error: auth.error }, 401);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = webhookBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const updates = parsed.data.records.map((record) => ({
    event_id: record.event_id ?? record.id ?? '',
    status: record.status ?? record.availability,
    seats_total: record.seats?.total ?? record.seats_total,
    seats_remaining: record.seats?.remaining ?? record.seats_remaining,
    updated_at: record.updated_at ?? parsed.data.sent_at,
  }));

  const items = upsertAvailabilityUpdates(updates);
  return c.json({
    success: true,
    provider: c.req.param('provider'),
    processed: items.length,
    items: items.map((item) => ({
      event_id: item.event_id,
      status: item.status,
      seats_total: item.seats_total,
      seats_remaining: item.seats_remaining,
      updated_at: item.updated_at,
    })),
  }, 200);
});
