import { Hono } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
    PARTNER_WEBHOOK_SECRET?: string;
    PARTNER_WEBHOOK_MAX_SKEW_SECONDS?: string;
  };
};

export const integrationsRouter = new Hono<Env>();

const webhookBodySchema = z.object({
  event_id: z.string().min(2).max(120),
  event_type: z.string().min(2).max(120),
  occurred_at: z.string().optional(),
  payload: z.record(z.unknown()),
});

const nonceStore = new Map<string, number>();

function nowMs(): number {
  return Date.now();
}

function parseSkewSeconds(raw?: string): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 300;
  return Math.max(30, Math.min(1800, Math.round(parsed)));
}

function cleanupNonces(ttlMs: number): void {
  const cutoff = nowMs() - ttlMs;
  for (const [nonce, ts] of nonceStore.entries()) {
    if (ts < cutoff) nonceStore.delete(nonce);
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifySignature(input: {
  secret: string;
  timestamp: string;
  nonce: string;
  body: string;
  signature: string;
}): Promise<boolean> {
  const expected = await sha256Hex(`${input.secret}.${input.timestamp}.${input.nonce}.${input.body}`);
  return expected === input.signature.toLowerCase();
}

integrationsRouter.post('/webhooks/:partner/events', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.api_webhook_access) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const secret = c.env.PARTNER_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return c.json({ success: false, error: 'webhook_secret_not_configured' }, 503);
  }

  const signature = (c.req.header('x-webhook-signature') ?? '').trim().toLowerCase();
  const timestamp = (c.req.header('x-webhook-timestamp') ?? '').trim();
  const nonce = (c.req.header('x-webhook-nonce') ?? '').trim();
  if (!signature || !timestamp || !nonce) {
    return c.json({ success: false, error: 'missing_signature_headers' }, 401);
  }

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs)) {
    return c.json({ success: false, error: 'invalid_timestamp' }, 401);
  }

  const maxSkewSeconds = parseSkewSeconds(c.env.PARTNER_WEBHOOK_MAX_SKEW_SECONDS);
  const maxSkewMs = maxSkewSeconds * 1000;
  if (Math.abs(nowMs() - timestampMs) > maxSkewMs) {
    return c.json({ success: false, error: 'timestamp_out_of_range' }, 401);
  }

  cleanupNonces(maxSkewMs);
  if (nonceStore.has(nonce)) {
    return c.json({ success: false, error: 'replay_detected' }, 409);
  }

  const rawBody = await c.req.text();
  const signed = await verifySignature({
    secret,
    timestamp,
    nonce,
    body: rawBody,
    signature,
  });
  if (!signed) {
    return c.json({ success: false, error: 'invalid_signature' }, 401);
  }

  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = webhookBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  nonceStore.set(nonce, nowMs());

  return c.json({
    success: true,
    partner: c.req.param('partner'),
    delivery_id: `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    accepted_at: new Date().toISOString(),
    event: parsed.data,
    replay_protection: {
      nonce,
      max_skew_seconds: maxSkewSeconds,
    },
  }, 202);
});

export function __resetWebhookReplayStateForTests(): void {
  nonceStore.clear();
}
