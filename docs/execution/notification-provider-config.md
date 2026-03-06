# Notification Provider Configuration

Use the following environment variables/secrets to enable live saved-search alert delivery.

## Core Endpoints

- `ALERT_EMAIL_WEBHOOK_URL` (or `ALERT_EMAIL_ENDPOINT_URL`)
- `ALERT_SMS_WEBHOOK_URL` (or `ALERT_SMS_ENDPOINT_URL`)
- `ALERT_PUSH_WEBHOOK_URL` (or `ALERT_PUSH_ENDPOINT_URL`)

## Provider Identity (optional)

- `ALERT_EMAIL_PROVIDER_NAME`
- `ALERT_SMS_PROVIDER_NAME`
- `ALERT_PUSH_PROVIDER_NAME`

## Provider Auth Secrets (optional)

- `ALERT_EMAIL_WEBHOOK_AUTH_TOKEN`
- `ALERT_SMS_WEBHOOK_AUTH_TOKEN`
- `ALERT_PUSH_WEBHOOK_AUTH_TOKEN`

## Reliability and Failover Controls

- `ALERT_MAX_RETRIES` (default `3`)
- `ALERT_RETRY_BASE_MS` (default `250`)
- `ALERT_FALLBACK_CHANNELS` (example: `sms,push`)
- `ALERT_EMAIL_FALLBACK_CHANNELS`
- `ALERT_SMS_FALLBACK_CHANNELS`
- `ALERT_PUSH_FALLBACK_CHANNELS`
- `ALERT_DELIVERY_SLO_MS` (default `4000`)
- `ALERT_RETRY_SLO_ATTEMPTS` (default `2`)

## Wrangler Secret Setup

```bash
wrangler secret put ALERT_EMAIL_WEBHOOK_URL
wrangler secret put ALERT_EMAIL_WEBHOOK_AUTH_TOKEN
wrangler secret put ALERT_SMS_WEBHOOK_URL
wrangler secret put ALERT_SMS_WEBHOOK_AUTH_TOKEN
wrangler secret put ALERT_PUSH_WEBHOOK_URL
wrangler secret put ALERT_PUSH_WEBHOOK_AUTH_TOKEN
```

## Runtime Behavior

- If no endpoint is configured for a channel, dispatch returns `stub` success.
- If a channel fails and `multi_channel_notifications` is enabled, dispatch automatically fails over to configured fallback channels.
- Response payloads include `selected_channel`, `channel_attempts`, and `slo_alerts` to support operational monitoring.
