import { Hono } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';
import { buildAiConciergeResponse, buildAiShortlistResponse } from '../../ai/concierge';
import { assessPromptSafety } from '../../ai/safety';
import { recordAiTelemetry } from '../../ai/telemetry';
import { boroughValues, categoryValues } from '../../search/unified-search';
import { buildAiDocumentHelperResponse, buildAiNegotiationPrepResponse } from '../../ai/assistants';
import {
  buildQualityRubric,
  decideReviewSample,
  listReviewSamples,
  maybeCreateReviewSample,
} from '../../ai/review-sampling';
import {
  approveFollowUpTemplate,
  buildNextBestActions,
  getSuppressionControls,
  listFollowUpDispatches,
  listFollowUpTemplates,
  runFollowUpAutomation,
  upsertSuppressionControls,
} from '../../ai/follow-up';

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
    AI_MODEL_AVAILABLE?: string;
    AI_CONCIERGE_MODEL_VERSION?: string;
    AI_SHORTLIST_MODEL_VERSION?: string;
    AI_NEGOTIATION_MODEL_VERSION?: string;
    AI_DOCUMENT_HELPER_MODEL_VERSION?: string;
    AI_FOLLOW_UP_MODEL_VERSION?: string;
    AI_NEXT_BEST_ACTION_MODEL_VERSION?: string;
    AI_REVIEW_SAMPLE_RATE?: string;
  };
};

export const aiRouter = new Hono<Env>();

const filtersSchema = z.object({
  borough: z.enum(boroughValues).optional(),
  category: z.enum(categoryValues).optional(),
  max_price: z.number().int().nonnegative().optional(),
  starts_before_hour: z.number().int().min(0).max(23).optional(),
  within_walk_minutes: z.number().int().min(1).max(120).optional(),
}).optional();

const conciergeBodySchema = z.object({
  query: z.string().min(2).max(240),
  session_id: z.string().max(64).optional(),
  retrieval_limit: z.number().int().min(1).max(8).default(4),
  filters: filtersSchema,
});

const shortlistBodySchema = z.object({
  intent: z.string().min(2).max(240),
  session_id: z.string().max(64).optional(),
  max_items: z.number().int().min(1).max(6).default(3),
  filters: filtersSchema,
});

const negotiationBodySchema = z.object({
  goals: z.array(z.string().min(2).max(180)).min(1).max(6),
  event_id: z.string().min(1).max(64).optional(),
  session_id: z.string().max(64).optional(),
  filters: filtersSchema,
  constraints: z.object({
    max_price: z.number().int().nonnegative().optional(),
    preferred_contact_channel: z.enum(['email', 'sms', 'phone']).optional(),
    must_haves: z.array(z.string().min(2).max(120)).max(6).optional(),
  }).optional(),
});

const documentHelperBodySchema = z.object({
  document_text: z.string().min(40).max(12000),
  listing_title: z.string().min(2).max(200).optional(),
  session_id: z.string().max(64).optional(),
  extraction_mode: z.enum(['summary_only', 'summary_and_checklist']).default('summary_and_checklist'),
});

const reviewDecisionBodySchema = z.object({
  decision: z.enum(['approved', 'needs_revision']),
  reviewer: z.string().max(100).optional(),
  notes: z.string().max(600).optional(),
});

const suppressionControlsBodySchema = z.object({
  recipient_id: z.string().min(2).max(120),
  quiet_hours_start: z.number().int().min(0).max(23).optional(),
  quiet_hours_end: z.number().int().min(0).max(23).optional(),
  frequency_cap_per_day: z.number().int().min(1).max(24).optional(),
  opt_out: z.boolean().optional(),
});

const approveFollowUpTemplateBodySchema = z.object({
  recipient_id: z.string().min(2).max(120),
  approved_by: z.string().max(120).optional(),
  template_version: z.string().max(40).optional(),
});

const followUpAutomationBodySchema = z.object({
  recipient_id: z.string().min(2).max(120),
  template_id: z.string().min(2).max(80),
  channel: z.enum(['email', 'sms', 'push']).optional(),
  session_id: z.string().max(64).optional(),
  send_at_hour: z.number().int().min(0).max(23).optional(),
  context: z.object({
    first_name: z.string().max(80).optional(),
    event_title: z.string().min(2).max(200),
    next_step: z.string().min(2).max(220),
    deadline: z.string().max(80).optional(),
  }),
});

const nextBestActionBodySchema = z.object({
  recipient_id: z.string().min(2).max(120),
  event_id: z.string().max(64).optional(),
  intent: z.string().max(240).optional(),
  session_id: z.string().max(64).optional(),
  send_at_hour: z.number().int().min(0).max(23).optional(),
  max_actions: z.number().int().min(1).max(6).default(3),
  funnel_stage: z.enum(['discovery', 'consideration', 'negotiation', 'ready_to_book', 'post_inquiry']).optional(),
  filters: filtersSchema,
  signals: z.object({
    shortlisted: z.boolean().optional(),
    inquiry_sent: z.boolean().optional(),
    schedule_requested: z.boolean().optional(),
    schedule_confirmed: z.boolean().optional(),
    docs_reviewed: z.boolean().optional(),
    price_drop_seen: z.boolean().optional(),
  }).optional(),
});

function parseBody<T>(input: unknown, schema: z.ZodSchema<T>): { ok: true; value: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'validation_error',
    };
  }
  return { ok: true, value: parsed.data };
}

function attachQuality(input: {
  feature: 'ai_concierge_chat' | 'ai_shortlist_builder' | 'ai_negotiation_prep_assistant' | 'ai_document_helper';
  output_type: string;
  output_text: string;
  citation_count: number;
  action_item_count: number;
  safe: boolean;
  session_id?: string;
  sampling_rate?: string;
}) {
  const rubric = buildQualityRubric({
    output_text: input.output_text,
    citation_count: input.citation_count,
    action_item_count: input.action_item_count,
    safe: input.safe,
  });
  const sample = maybeCreateReviewSample({
    feature: input.feature,
    output_type: input.output_type,
    output_text: input.output_text,
    rubric,
    session_id: input.session_id,
    sampling_rate: input.sampling_rate,
  });

  return {
    quality: {
      rubric,
      sampled_for_review: Boolean(sample),
      ...(sample ? { review_sample_id: sample.id, sampling_reason: sample.sampling_reason } : {}),
    },
    sample,
  };
}

aiRouter.post('/concierge', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_concierge_chat) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, conciergeBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const safety = assessPromptSafety(parsed.value.query);
  if (!safety.safe) {
    return c.json({ success: false, error: 'unsafe_prompt', safety }, 422);
  }

  const response = buildAiConciergeResponse({
    query: parsed.value.query,
    model_available: c.env.AI_MODEL_AVAILABLE,
    model_version: c.env.AI_CONCIERGE_MODEL_VERSION,
    retrieval_limit: parsed.value.retrieval_limit ?? 4,
    filters: parsed.value.filters,
  });

  const qualityResult = attachQuality({
    feature: 'ai_concierge_chat',
    output_type: 'answer',
    output_text: response.answer,
    citation_count: response.citations.length,
    action_item_count: 1,
    safe: true,
    session_id: parsed.value.session_id,
    sampling_rate: c.env.AI_REVIEW_SAMPLE_RATE,
  });

  await recordAiTelemetry({
    database_url: c.env?.DATABASE_URL,
    event_name: 'ai_concierge_prompt_telemetry',
    properties: {
      prompt_version: response.telemetry.prompt_version,
      model_version: response.telemetry.model_version,
      fallback_used: response.telemetry.fallback_used,
      fallback_reason: response.telemetry.fallback_reason,
      retrieval_count: response.telemetry.retrieval_count,
      quality_band: qualityResult.quality.rubric.band,
      quality_score: qualityResult.quality.rubric.overall_score,
      sampled_for_review: qualityResult.quality.sampled_for_review,
    },
    session_id: parsed.value.session_id,
  });

  if (response.telemetry.fallback_used) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_fallback_telemetry',
      properties: {
        feature: 'ai_concierge_chat',
        reason: response.telemetry.fallback_reason ?? 'unknown',
        prompt_version: response.telemetry.prompt_version,
      },
      session_id: parsed.value.session_id,
    });
  }

  if (qualityResult.sample) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_quality_sampled_telemetry',
      properties: {
        feature: 'ai_concierge_chat',
        sample_id: qualityResult.sample.id,
        sampling_reason: qualityResult.sample.sampling_reason,
        quality_score: qualityResult.quality.rubric.overall_score,
      },
      session_id: parsed.value.session_id,
    });
  }

  return c.json(
    {
      success: true,
      answer: response.answer,
      citations: response.citations,
      telemetry: response.telemetry,
      quality: qualityResult.quality,
    },
    200,
  );
});

aiRouter.post('/shortlist', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_shortlist_builder) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, shortlistBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const safety = assessPromptSafety(parsed.value.intent);
  if (!safety.safe) {
    return c.json({ success: false, error: 'unsafe_prompt', safety }, 422);
  }

  const response = buildAiShortlistResponse({
    intent: parsed.value.intent,
    model_available: c.env.AI_MODEL_AVAILABLE,
    model_version: c.env.AI_SHORTLIST_MODEL_VERSION,
    max_items: parsed.value.max_items ?? 3,
    filters: parsed.value.filters,
  });

  const qualityResult = attachQuality({
    feature: 'ai_shortlist_builder',
    output_type: 'shortlist',
    output_text: `${response.summary}\n${response.shortlist.map((item) => `${item.title}: ${item.rationale}`).join('\n')}`,
    citation_count: response.shortlist.length,
    action_item_count: response.shortlist.length,
    safe: true,
    session_id: parsed.value.session_id,
    sampling_rate: c.env.AI_REVIEW_SAMPLE_RATE,
  });

  await recordAiTelemetry({
    database_url: c.env?.DATABASE_URL,
    event_name: 'ai_shortlist_prompt_telemetry',
    properties: {
      prompt_version: response.telemetry.prompt_version,
      model_version: response.telemetry.model_version,
      fallback_used: response.telemetry.fallback_used,
      fallback_reason: response.telemetry.fallback_reason,
      retrieval_count: response.telemetry.retrieval_count,
      shortlist_count: response.shortlist.length,
      quality_band: qualityResult.quality.rubric.band,
      quality_score: qualityResult.quality.rubric.overall_score,
      sampled_for_review: qualityResult.quality.sampled_for_review,
    },
    session_id: parsed.value.session_id,
  });

  if (response.telemetry.fallback_used) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_fallback_telemetry',
      properties: {
        feature: 'ai_shortlist_builder',
        reason: response.telemetry.fallback_reason ?? 'unknown',
        prompt_version: response.telemetry.prompt_version,
      },
      session_id: parsed.value.session_id,
    });
  }

  if (qualityResult.sample) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_quality_sampled_telemetry',
      properties: {
        feature: 'ai_shortlist_builder',
        sample_id: qualityResult.sample.id,
        sampling_reason: qualityResult.sample.sampling_reason,
        quality_score: qualityResult.quality.rubric.overall_score,
      },
      session_id: parsed.value.session_id,
    });
  }

  return c.json(
    {
      success: true,
      shortlist: response.shortlist,
      summary: response.summary,
      telemetry: response.telemetry,
      quality: qualityResult.quality,
    },
    200,
  );
});

aiRouter.post('/negotiation-prep', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_negotiation_prep_assistant) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, negotiationBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const safety = assessPromptSafety(parsed.value.goals.join(' '));
  if (!safety.safe) {
    return c.json({ success: false, error: 'unsafe_prompt', safety }, 422);
  }

  const response = buildAiNegotiationPrepResponse({
    goals: parsed.value.goals,
    constraints: parsed.value.constraints,
    event_id: parsed.value.event_id,
    filters: parsed.value.filters,
    model_available: c.env.AI_MODEL_AVAILABLE,
    model_version: c.env.AI_NEGOTIATION_MODEL_VERSION,
  });

  const qualityResult = attachQuality({
    feature: 'ai_negotiation_prep_assistant',
    output_type: 'negotiation_prep',
    output_text: `${response.summary}\n${response.talking_points.join('\n')}\n${response.red_flags.join('\n')}`,
    citation_count: response.context.event_id ? 1 : 0,
    action_item_count: response.talking_points.length + response.suggested_concessions.length,
    safe: true,
    session_id: parsed.value.session_id,
    sampling_rate: c.env.AI_REVIEW_SAMPLE_RATE,
  });

  await recordAiTelemetry({
    database_url: c.env?.DATABASE_URL,
    event_name: 'ai_negotiation_prompt_telemetry',
    properties: {
      prompt_version: response.telemetry.prompt_version,
      model_version: response.telemetry.model_version,
      fallback_used: response.telemetry.fallback_used,
      fallback_reason: response.telemetry.fallback_reason,
      retrieval_count: response.telemetry.retrieval_count,
      talking_point_count: response.talking_points.length,
      quality_band: qualityResult.quality.rubric.band,
      quality_score: qualityResult.quality.rubric.overall_score,
      sampled_for_review: qualityResult.quality.sampled_for_review,
    },
    session_id: parsed.value.session_id,
  });

  if (response.telemetry.fallback_used) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_fallback_telemetry',
      properties: {
        feature: 'ai_negotiation_prep_assistant',
        reason: response.telemetry.fallback_reason ?? 'unknown',
        prompt_version: response.telemetry.prompt_version,
      },
      session_id: parsed.value.session_id,
    });
  }

  if (qualityResult.sample) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_quality_sampled_telemetry',
      properties: {
        feature: 'ai_negotiation_prep_assistant',
        sample_id: qualityResult.sample.id,
        sampling_reason: qualityResult.sample.sampling_reason,
        quality_score: qualityResult.quality.rubric.overall_score,
      },
      session_id: parsed.value.session_id,
    });
  }

  return c.json(
    {
      success: true,
      summary: response.summary,
      talking_points: response.talking_points,
      suggested_concessions: response.suggested_concessions,
      red_flags: response.red_flags,
      opening_script: response.opening_script,
      context: response.context,
      telemetry: response.telemetry,
      quality: qualityResult.quality,
    },
    200,
  );
});

aiRouter.post('/document-helper', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_document_helper) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, documentHelperBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const safety = assessPromptSafety(parsed.value.document_text.slice(0, 1200));
  if (!safety.safe) {
    return c.json({ success: false, error: 'unsafe_prompt', safety }, 422);
  }

  const response = buildAiDocumentHelperResponse({
    document_text: parsed.value.document_text,
    extraction_mode: parsed.value.extraction_mode ?? 'summary_and_checklist',
    model_available: c.env.AI_MODEL_AVAILABLE,
    model_version: c.env.AI_DOCUMENT_HELPER_MODEL_VERSION,
  });

  const qualityResult = attachQuality({
    feature: 'ai_document_helper',
    output_type: 'document_summary',
    output_text: `${response.summary}\n${response.checklist.map((item) => `${item.item}:${item.status}`).join('\n')}\n${response.action_items.join('\n')}`,
    citation_count: response.checklist.filter((item) => item.status === 'present').length,
    action_item_count: response.action_items.length,
    safe: true,
    session_id: parsed.value.session_id,
    sampling_rate: c.env.AI_REVIEW_SAMPLE_RATE,
  });

  await recordAiTelemetry({
    database_url: c.env?.DATABASE_URL,
    event_name: 'ai_document_helper_prompt_telemetry',
    properties: {
      prompt_version: response.telemetry.prompt_version,
      model_version: response.telemetry.model_version,
      fallback_used: response.telemetry.fallback_used,
      fallback_reason: response.telemetry.fallback_reason,
      retrieval_count: response.telemetry.retrieval_count,
      checklist_count: response.checklist.length,
      action_item_count: response.action_items.length,
      quality_band: qualityResult.quality.rubric.band,
      quality_score: qualityResult.quality.rubric.overall_score,
      sampled_for_review: qualityResult.quality.sampled_for_review,
    },
    session_id: parsed.value.session_id,
  });

  if (response.telemetry.fallback_used) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_fallback_telemetry',
      properties: {
        feature: 'ai_document_helper',
        reason: response.telemetry.fallback_reason ?? 'unknown',
        prompt_version: response.telemetry.prompt_version,
      },
      session_id: parsed.value.session_id,
    });
  }

  if (qualityResult.sample) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_quality_sampled_telemetry',
      properties: {
        feature: 'ai_document_helper',
        sample_id: qualityResult.sample.id,
        sampling_reason: qualityResult.sample.sampling_reason,
        quality_score: qualityResult.quality.rubric.overall_score,
      },
      session_id: parsed.value.session_id,
    });
  }

  return c.json(
    {
      success: true,
      summary: response.summary,
      checklist: response.checklist,
      action_items: response.action_items,
      telemetry: response.telemetry,
      quality: qualityResult.quality,
    },
    200,
  );
});

aiRouter.get('/follow-up/templates', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_follow_up_automation) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  return c.json({
    success: true,
    items: listFollowUpTemplates(),
  }, 200);
});

aiRouter.post('/follow-up/templates/:template_id/approve', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_follow_up_automation) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, approveFollowUpTemplateBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const template_id = c.req.param('template_id')?.trim();
  if (!template_id) {
    return c.json({ success: false, error: 'invalid_template_id' }, 422);
  }

  const approved = approveFollowUpTemplate({
    recipient_id: parsed.value.recipient_id,
    template_id,
    approved_by: parsed.value.approved_by,
    template_version: parsed.value.template_version,
  });
  if (!approved.success) {
    return c.json({ success: false, error: approved.error ?? 'approval_failed' }, 404);
  }

  return c.json({ success: true, approval: approved.approval }, 200);
});

aiRouter.get('/suppression-controls/:recipient_id', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_follow_up_automation && !flags.ai_next_best_action) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const recipient_id = c.req.param('recipient_id')?.trim();
  if (!recipient_id) {
    return c.json({ success: false, error: 'invalid_recipient_id' }, 422);
  }
  const controls = getSuppressionControls(recipient_id);
  return c.json({ success: true, controls }, 200);
});

aiRouter.post('/suppression-controls', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_follow_up_automation && !flags.ai_next_best_action) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, suppressionControlsBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const controls = upsertSuppressionControls(parsed.value);
  await recordAiTelemetry({
    database_url: c.env?.DATABASE_URL,
    event_name: 'ai_suppression_enforcement_telemetry',
    properties: {
      recipient_id: controls.recipient_id,
      quiet_hours_start: controls.quiet_hours_start,
      quiet_hours_end: controls.quiet_hours_end,
      frequency_cap_per_day: controls.frequency_cap_per_day,
      opt_out: controls.opt_out,
    },
  });

  return c.json({ success: true, controls }, 200);
});

aiRouter.post('/follow-up-automation', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_follow_up_automation) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, followUpAutomationBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const run = runFollowUpAutomation({
    recipient_id: parsed.value.recipient_id,
    template_id: parsed.value.template_id,
    channel: parsed.value.channel,
    send_at_hour: parsed.value.send_at_hour,
    context: parsed.value.context,
  });

  if (!run.success) {
    return c.json({ success: false, error: run.error ?? 'automation_failed' }, 422);
  }

  await recordAiTelemetry({
    database_url: c.env?.DATABASE_URL,
    event_name: 'ai_follow_up_prompt_telemetry',
    properties: {
      prompt_version: 'ai_follow_up_prompt_v1',
      model_version: c.env.AI_FOLLOW_UP_MODEL_VERSION?.trim() || 'follow-up-local-2026-03-01',
      template_id: parsed.value.template_id,
      recipient_id: parsed.value.recipient_id.toLowerCase(),
      dispatch_status: run.dispatch?.status,
      suppression_reason: run.dispatch?.suppression_reason,
    },
    session_id: parsed.value.session_id,
  });

  if (run.dispatch?.status === 'suppressed' && run.dispatch.suppression_reason) {
    await recordAiTelemetry({
      database_url: c.env?.DATABASE_URL,
      event_name: 'ai_suppression_enforcement_telemetry',
      properties: {
        feature: 'ai_follow_up_automation',
        recipient_id: parsed.value.recipient_id.toLowerCase(),
        reason: run.dispatch.suppression_reason,
      },
      session_id: parsed.value.session_id,
    });
  }

  return c.json({
    success: true,
    dispatch: run.dispatch,
    suppression: run.suppression,
  }, 200);
});

aiRouter.get('/follow-up-automation/dispatches', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_follow_up_automation) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  const recipient_id = c.req.query('recipient_id');
  return c.json({ success: true, items: listFollowUpDispatches(recipient_id) }, 200);
});

aiRouter.post('/next-best-action', async (c) => {
  const flags = resolveFeatureFlags(c.env);
  if (!flags.ai_next_best_action) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, nextBestActionBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const response = buildNextBestActions({
    recipient_id: parsed.value.recipient_id,
    event_id: parsed.value.event_id,
    intent: parsed.value.intent,
    filters: parsed.value.filters,
    funnel_stage: parsed.value.funnel_stage,
    signals: parsed.value.signals,
    max_actions: parsed.value.max_actions,
    send_at_hour: parsed.value.send_at_hour,
  });

  await recordAiTelemetry({
    database_url: c.env?.DATABASE_URL,
    event_name: 'ai_next_best_action_prompt_telemetry',
    properties: {
      prompt_version: response.telemetry.prompt_version,
      model_version: c.env.AI_NEXT_BEST_ACTION_MODEL_VERSION?.trim() || response.telemetry.model_version,
      retrieval_count: response.telemetry.retrieval_count,
      action_count: response.actions.length,
      suppressed_actions: response.actions.filter((action) => action.suppressed).length,
      funnel_stage: parsed.value.funnel_stage ?? 'derived',
    },
    session_id: parsed.value.session_id,
  });

  return c.json({
    success: true,
    summary: response.summary,
    actions: response.actions,
    suppression: response.suppression,
    telemetry: {
      ...response.telemetry,
      model_version: c.env.AI_NEXT_BEST_ACTION_MODEL_VERSION?.trim() || response.telemetry.model_version,
    },
  }, 200);
});

aiRouter.get('/review-sampling/queue', async (c) => {
  const items = listReviewSamples();
  return c.json({ success: true, items }, 200);
});

aiRouter.post('/review-sampling/:sample_id/decision', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = parseBody(body, reviewDecisionBodySchema);
  if (!parsed.ok) {
    return c.json({ success: false, error: parsed.error }, 422);
  }

  const sample_id = c.req.param('sample_id')?.trim();
  if (!sample_id) {
    return c.json({ success: false, error: 'invalid_sample_id' }, 422);
  }

  const item = decideReviewSample({
    sample_id,
    decision: parsed.value.decision,
    reviewer: parsed.value.reviewer,
    notes: parsed.value.notes,
  });

  if (!item) {
    return c.json({ success: false, error: 'not_found' }, 404);
  }

  await recordAiTelemetry({
    database_url: c.env?.DATABASE_URL,
    event_name: 'ai_review_decision_telemetry',
    properties: {
      sample_id,
      decision: parsed.value.decision,
      reviewer: parsed.value.reviewer,
      quality_score: item.rubric.overall_score,
      feature: item.feature,
    },
    session_id: item.session_id,
  });

  return c.json({ success: true, item }, 200);
});
