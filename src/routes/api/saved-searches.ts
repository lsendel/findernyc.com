import { Hono } from 'hono';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { createDb } from '../../db/client';
import { alert_delivery_attempts, saved_searches } from '../../db/schema';
import { resolveFeatureFlags } from '../../config/feature-flags';
import {
  dispatchSavedSearchAlertWithFailover,
  type AlertChannel,
  type AlertDispatchAggregateResult,
  type AlertDispatchAttempt,
} from '../../notifications/alerts';

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
    ALERT_EMAIL_WEBHOOK_URL?: string;
    ALERT_SMS_WEBHOOK_URL?: string;
    ALERT_PUSH_WEBHOOK_URL?: string;
    ALERT_EMAIL_ENDPOINT_URL?: string;
    ALERT_SMS_ENDPOINT_URL?: string;
    ALERT_PUSH_ENDPOINT_URL?: string;
    ALERT_EMAIL_PROVIDER_NAME?: string;
    ALERT_SMS_PROVIDER_NAME?: string;
    ALERT_PUSH_PROVIDER_NAME?: string;
    ALERT_EMAIL_WEBHOOK_AUTH_TOKEN?: string;
    ALERT_SMS_WEBHOOK_AUTH_TOKEN?: string;
    ALERT_PUSH_WEBHOOK_AUTH_TOKEN?: string;
    ALERT_FALLBACK_CHANNELS?: string;
    ALERT_EMAIL_FALLBACK_CHANNELS?: string;
    ALERT_SMS_FALLBACK_CHANNELS?: string;
    ALERT_PUSH_FALLBACK_CHANNELS?: string;
    ALERT_DELIVERY_SLO_MS?: string;
    ALERT_RETRY_SLO_ATTEMPTS?: string;
    ALERT_MAX_RETRIES?: string;
    ALERT_RETRY_BASE_MS?: string;
  };
};

export const savedSearchesRouter = new Hono<Env>();

type StubSavedSearch = {
  id: number;
  query_text: string;
  channel: AlertChannel;
  destination: string | null;
  is_active: boolean;
  created_at: Date;
};

type StubDeliveryAttempt = {
  id: number;
  provider: string;
  success: boolean;
  delivery: string;
  attempt_count: number;
  status_code: number | null;
  error: string | null;
  created_at: Date;
};

const stubSavedSearches = new Map<number, StubSavedSearch>();
const stubDeliveryAttempts = new Map<number, StubDeliveryAttempt[]>();
let nextStubSavedSearchId = 1;

const filtersSchema = z.object({
  borough: z.enum(['manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island']).optional(),
  category: z.enum(['music', 'food', 'arts', 'networking', 'family', 'wellness']).optional(),
}).optional();

const createBodySchema = z.object({
  query_text: z.string().min(2).max(200),
  filters: filtersSchema,
  channel: z.enum(['email', 'sms', 'push']).default('email'),
  destination: z.string().max(255).optional(),
  session_id: z.string().max(64).optional(),
});

async function persistAttempt(params: {
  db: ReturnType<typeof createDb>;
  saved_search_id: number;
  attempts: AlertDispatchAttempt[];
}) {
  if (params.attempts.length === 0) return;
  await params.db.insert(alert_delivery_attempts).values(
    params.attempts.map((attempt) => ({
      saved_search_id: params.saved_search_id,
      channel: attempt.channel,
      provider: attempt.provider,
      delivery: attempt.delivery,
      success: attempt.success,
      attempt_count: attempt.attempt_count,
      status_code: attempt.status_code,
      error: attempt.error,
    })),
  );
}

async function dispatchAlertForSavedSearch(params: {
  saved_search_id: number;
  query_text: string;
  channel: AlertChannel;
  destination?: string | null;
  env: Env['Bindings'];
  multiChannelEnabled: boolean;
}): Promise<AlertDispatchAggregateResult> {
  return dispatchSavedSearchAlertWithFailover(
    {
      saved_search_id: params.saved_search_id,
      query_text: params.query_text,
      channel: params.channel,
      destination: params.destination,
    },
    params.env,
    {
      enableFailover: params.multiChannelEnabled,
    },
  );
}

savedSearchesRouter.post('/', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.saved_searches_alerts) {
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

  const { query_text, filters, channel, destination, session_id } = parsed.data;
  const databaseUrl = c.env?.DATABASE_URL ?? '';
  if (!databaseUrl) {
    const id = nextStubSavedSearchId++;
    stubSavedSearches.set(id, {
      id,
      query_text,
      channel,
      destination: destination ?? null,
      is_active: true,
      created_at: new Date(),
    });
    return c.json({ success: true, id, delivery: 'stub' }, 201);
  }

  const db = createDb(databaseUrl);
  const inserted = await db
    .insert(saved_searches)
    .values({ query_text, filters, channel, destination, session_id })
    .returning({ id: saved_searches.id });

  return c.json({ success: true, id: inserted[0]?.id ?? 0, delivery: 'queued' }, 201);
});

savedSearchesRouter.get('/', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.saved_searches_alerts) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const databaseUrl = c.env?.DATABASE_URL ?? '';
  if (!databaseUrl) {
    const items = Array.from(stubSavedSearches.values())
      .filter((item) => item.is_active)
      .sort((left, right) => right.created_at.getTime() - left.created_at.getTime())
      .slice(0, 20);
    return c.json({ success: true, items }, 200);
  }

  const db = createDb(databaseUrl);
  const items = await db
    .select({
      id: saved_searches.id,
      query_text: saved_searches.query_text,
      channel: saved_searches.channel,
      destination: saved_searches.destination,
      is_active: saved_searches.is_active,
      created_at: saved_searches.created_at,
    })
    .from(saved_searches)
    .where(eq(saved_searches.is_active, true))
    .orderBy(desc(saved_searches.created_at))
    .limit(20);

  return c.json({ success: true, items }, 200);
});

savedSearchesRouter.post('/:id/send-alert', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.saved_searches_alerts) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ success: false, error: 'invalid_id' }, 422);
  }

  const databaseUrl = c.env?.DATABASE_URL ?? '';
  const sent_at = new Date().toISOString();
  const multiChannelEnabled = flags.multi_channel_notifications;
  if (!databaseUrl) {
    const record = stubSavedSearches.get(id);
    if (!record) {
      return c.json({ success: false, error: 'not_found' }, 404);
    }
    const dispatch = await dispatchAlertForSavedSearch({
      saved_search_id: id,
      query_text: record.query_text,
      channel: record.channel,
      destination: record.destination,
      env: c.env,
      multiChannelEnabled,
    });
    const existingAttempts = stubDeliveryAttempts.get(id) ?? [];
    const nextAttemptId = existingAttempts.length + 1;
    const attemptRecords = dispatch.channel_attempts.map((attempt, index) => ({
      id: nextAttemptId + index,
      provider: attempt.provider,
      success: attempt.success,
      delivery: attempt.delivery,
      attempt_count: attempt.attempt_count,
      status_code: attempt.status_code ?? null,
      error: attempt.error ?? null,
      created_at: new Date(),
    }));
    stubDeliveryAttempts.set(id, [...attemptRecords.reverse(), ...existingAttempts]);
    return c.json({
      success: dispatch.success,
      id,
      delivery: dispatch.delivery,
      provider: dispatch.provider,
      attempt_count: dispatch.attempt_count,
      status_code: dispatch.status_code,
      selected_channel: dispatch.selected_channel,
      channel_attempts: dispatch.channel_attempts,
      slo_alerts: dispatch.slo_alerts,
      sent_at,
    }, dispatch.success ? 200 : 502);
  }

  const db = createDb(databaseUrl);
  const found = await db
    .select({
      id: saved_searches.id,
      query_text: saved_searches.query_text,
      channel: saved_searches.channel,
      destination: saved_searches.destination,
    })
    .from(saved_searches)
    .where(eq(saved_searches.id, id))
    .limit(1);

  if (found.length === 0) {
    return c.json({ success: false, error: 'not_found' }, 404);
  }

  const record = found[0];
  const dispatch = await dispatchAlertForSavedSearch({
    saved_search_id: id,
    query_text: record.query_text,
    channel: record.channel as AlertChannel,
    destination: record.destination,
    env: c.env,
    multiChannelEnabled,
  });
  await persistAttempt({
    db,
    saved_search_id: id,
    attempts: dispatch.channel_attempts,
  });

  if (!dispatch.success) {
    return c.json({
      success: false,
      error: dispatch.error ?? 'provider_error',
      provider: dispatch.provider,
      delivery: dispatch.delivery,
      attempt_count: dispatch.attempt_count,
      status_code: dispatch.status_code,
      selected_channel: dispatch.selected_channel,
      channel_attempts: dispatch.channel_attempts,
      slo_alerts: dispatch.slo_alerts,
    }, 502);
  }

  return c.json({
    success: true,
    id,
    delivery: dispatch.delivery,
    provider: dispatch.provider,
    attempt_count: dispatch.attempt_count,
    status_code: dispatch.status_code,
    selected_channel: dispatch.selected_channel,
    channel_attempts: dispatch.channel_attempts,
    slo_alerts: dispatch.slo_alerts,
    sent_at,
  }, 200);
});

savedSearchesRouter.get('/:id/delivery-attempts', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.saved_searches_alerts) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return c.json({ success: false, error: 'invalid_id' }, 422);
  }

  const databaseUrl = c.env?.DATABASE_URL ?? '';
  if (!databaseUrl) {
    return c.json({ success: true, items: stubDeliveryAttempts.get(id) ?? [] }, 200);
  }

  const db = createDb(databaseUrl);
  const items = await db
    .select({
      id: alert_delivery_attempts.id,
      provider: alert_delivery_attempts.provider,
      success: alert_delivery_attempts.success,
      delivery: alert_delivery_attempts.delivery,
      attempt_count: alert_delivery_attempts.attempt_count,
      status_code: alert_delivery_attempts.status_code,
      error: alert_delivery_attempts.error,
      created_at: alert_delivery_attempts.created_at,
    })
    .from(alert_delivery_attempts)
    .where(eq(alert_delivery_attempts.saved_search_id, id))
    .orderBy(desc(alert_delivery_attempts.created_at))
    .limit(25);

  return c.json({ success: true, items }, 200);
});

export function __resetSavedSearchesStubStateForTests(): void {
  stubSavedSearches.clear();
  stubDeliveryAttempts.clear();
  nextStubSavedSearchId = 1;
}
