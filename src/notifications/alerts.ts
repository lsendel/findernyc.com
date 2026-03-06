export type AlertChannel = 'email' | 'sms' | 'push';

export type AlertDispatchRequest = {
  channel: AlertChannel;
  query_text: string;
  destination?: string | null;
  saved_search_id: number;
};

export type AlertDispatchResult = {
  success: boolean;
  provider: string;
  delivery: 'stub' | 'queued';
  attempt_count: number;
  status_code?: number;
  message_id?: string;
  error?: string;
  latency_ms?: number;
};

type NotificationBindings = {
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

function getWebhookUrl(bindings: NotificationBindings, channel: AlertChannel): string {
  if (channel === 'email') return bindings.ALERT_EMAIL_WEBHOOK_URL ?? bindings.ALERT_EMAIL_ENDPOINT_URL ?? '';
  if (channel === 'sms') return bindings.ALERT_SMS_WEBHOOK_URL ?? bindings.ALERT_SMS_ENDPOINT_URL ?? '';
  return bindings.ALERT_PUSH_WEBHOOK_URL ?? bindings.ALERT_PUSH_ENDPOINT_URL ?? '';
}

function getProviderName(bindings: NotificationBindings, channel: AlertChannel, webhook: string): string {
  const custom = channel === 'email'
    ? bindings.ALERT_EMAIL_PROVIDER_NAME
    : channel === 'sms'
      ? bindings.ALERT_SMS_PROVIDER_NAME
      : bindings.ALERT_PUSH_PROVIDER_NAME;
  if (custom?.trim()) return custom.trim();
  if (!webhook) return `${channel}-stub`;
  return `${channel}-webhook`;
}

function getAuthToken(bindings: NotificationBindings, channel: AlertChannel): string {
  if (channel === 'email') return bindings.ALERT_EMAIL_WEBHOOK_AUTH_TOKEN ?? '';
  if (channel === 'sms') return bindings.ALERT_SMS_WEBHOOK_AUTH_TOKEN ?? '';
  return bindings.ALERT_PUSH_WEBHOOK_AUTH_TOKEN ?? '';
}

function buildAlertMessage(input: AlertDispatchRequest): string {
  return `New matches for saved search #${input.saved_search_id}: "${input.query_text}"`;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseChannelList(raw: string | undefined): AlertChannel[] {
  if (!raw?.trim()) return [];
  const channels = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AlertChannel => item === 'email' || item === 'sms' || item === 'push');
  return Array.from(new Set(channels));
}

function resolveFallbackChannels(bindings: NotificationBindings, primary: AlertChannel): AlertChannel[] {
  const raw = primary === 'email'
    ? (bindings.ALERT_EMAIL_FALLBACK_CHANNELS ?? bindings.ALERT_FALLBACK_CHANNELS)
    : primary === 'sms'
      ? (bindings.ALERT_SMS_FALLBACK_CHANNELS ?? bindings.ALERT_FALLBACK_CHANNELS)
      : (bindings.ALERT_PUSH_FALLBACK_CHANNELS ?? bindings.ALERT_FALLBACK_CHANNELS);
  return parseChannelList(raw).filter((channel) => channel !== primary);
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function dispatchSavedSearchAlert(
  input: AlertDispatchRequest,
  bindings: NotificationBindings,
): Promise<AlertDispatchResult> {
  const startedAt = Date.now();
  const webhook = getWebhookUrl(bindings, input.channel);
  const provider = getProviderName(bindings, input.channel, webhook);
  const authToken = getAuthToken(bindings, input.channel);
  const maxRetries = parsePositiveInt(bindings.ALERT_MAX_RETRIES, 3);
  const baseRetryMs = parsePositiveInt(bindings.ALERT_RETRY_BASE_MS, 250);

  if (!webhook) {
    return {
      success: true,
      provider,
      delivery: 'stub',
      attempt_count: 0,
      message_id: `stub_${input.saved_search_id}_${Date.now()}`,
      latency_ms: Date.now() - startedAt,
    };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'X-Alert-Provider': provider,
        },
        body: JSON.stringify({
          channel: input.channel,
          destination: input.destination ?? null,
          saved_search_id: input.saved_search_id,
          query_text: input.query_text,
          message: buildAlertMessage(input),
        }),
      });
    } catch (error) {
      if (attempt < maxRetries) {
        await waitMs(baseRetryMs * 2 ** (attempt - 1));
        continue;
      }
      return {
        success: false,
        provider,
        delivery: 'queued',
        attempt_count: attempt,
        error: error instanceof Error ? error.message : String(error),
        latency_ms: Date.now() - startedAt,
      };
    }

    if (response.ok) {
      return {
        success: true,
        provider,
        delivery: 'queued',
        attempt_count: attempt,
        status_code: response.status,
        message_id: `webhook_${input.saved_search_id}_${Date.now()}`,
        latency_ms: Date.now() - startedAt,
      };
    }

    if (attempt < maxRetries && shouldRetry(response.status)) {
      await waitMs(baseRetryMs * 2 ** (attempt - 1));
      continue;
    }

    return {
      success: false,
      provider,
      delivery: 'queued',
      attempt_count: attempt,
      status_code: response.status,
      error: `provider_http_${response.status}`,
      latency_ms: Date.now() - startedAt,
    };
  }

  return {
    success: false,
    provider,
    delivery: 'queued',
    attempt_count: maxRetries,
    error: 'retry_exhausted',
    latency_ms: Date.now() - startedAt,
  };
}

export type AlertDispatchAttempt = AlertDispatchResult & {
  channel: AlertChannel;
};

export type AlertDispatchAggregateResult = AlertDispatchResult & {
  selected_channel: AlertChannel;
  channel_attempts: AlertDispatchAttempt[];
  slo_alerts: string[];
};

export async function dispatchSavedSearchAlertWithFailover(
  input: AlertDispatchRequest,
  bindings: NotificationBindings,
  options?: {
    enableFailover?: boolean;
    fallbackChannels?: AlertChannel[];
  },
): Promise<AlertDispatchAggregateResult> {
  const deliverySloMs = parsePositiveInt(bindings.ALERT_DELIVERY_SLO_MS, 4000);
  const retrySloAttempts = parsePositiveInt(bindings.ALERT_RETRY_SLO_ATTEMPTS, 2);
  const fallbackChannels = options?.fallbackChannels ?? resolveFallbackChannels(bindings, input.channel);
  const channels = options?.enableFailover
    ? [input.channel, ...fallbackChannels.filter((channel) => channel !== input.channel)]
    : [input.channel];

  const attempts: AlertDispatchAttempt[] = [];
  const sloAlerts = new Set<string>();
  for (const channel of channels) {
    const dispatch = await dispatchSavedSearchAlert(
      {
        ...input,
        channel,
      },
      bindings,
    );

    if (typeof dispatch.latency_ms === 'number' && dispatch.latency_ms > deliverySloMs) {
      sloAlerts.add(`delivery_slo_breached_${channel}`);
    }
    if (dispatch.attempt_count > retrySloAttempts) {
      sloAlerts.add(`retry_slo_breached_${channel}`);
    }

    attempts.push({
      ...dispatch,
      channel,
    });

    if (dispatch.success) {
      if (attempts.length > 1) sloAlerts.add('failover_triggered');
      return {
        ...dispatch,
        selected_channel: channel,
        channel_attempts: attempts,
        slo_alerts: Array.from(sloAlerts),
      };
    }
  }

  const last = attempts[attempts.length - 1];
  if (attempts.length > 1) sloAlerts.add('failover_triggered');
  return {
    success: false,
    provider: last?.provider ?? `${input.channel}-stub`,
    delivery: last?.delivery ?? 'stub',
    attempt_count: last?.attempt_count ?? 0,
    status_code: last?.status_code,
    message_id: last?.message_id,
    error: last?.error ?? 'provider_error',
    latency_ms: last?.latency_ms,
    selected_channel: last?.channel ?? input.channel,
    channel_attempts: attempts,
    slo_alerts: Array.from(sloAlerts),
  };
}
