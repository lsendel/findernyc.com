import { createDb } from '../db/client';
import { analytics_events } from '../db/schema';

export type AiTelemetryEventName =
  | 'ai_concierge_prompt_telemetry'
  | 'ai_shortlist_prompt_telemetry'
  | 'ai_negotiation_prompt_telemetry'
  | 'ai_document_helper_prompt_telemetry'
  | 'ai_follow_up_prompt_telemetry'
  | 'ai_next_best_action_prompt_telemetry'
  | 'ai_suppression_enforcement_telemetry'
  | 'ai_quality_sampled_telemetry'
  | 'ai_review_decision_telemetry'
  | 'ai_fallback_telemetry';

export async function recordAiTelemetry(input: {
  database_url?: string;
  event_name: AiTelemetryEventName;
  properties: Record<string, unknown>;
  session_id?: string;
}): Promise<void> {
  const databaseUrl = input.database_url?.trim();
  if (!databaseUrl) return;

  try {
    const db = createDb(databaseUrl);
    await db.insert(analytics_events).values({
      event_name: input.event_name,
      properties: input.properties,
      session_id: input.session_id,
    });
  } catch {
    // Telemetry must not block request execution.
  }
}
