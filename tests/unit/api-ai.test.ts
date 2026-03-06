import { describe, it, expect } from 'vitest';
import app from '../../src/index';

describe('AI API routes', () => {
  it('returns 503 for concierge when ai_concierge_chat is disabled', async () => {
    const res = await app.request('/api/ai/concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'cheap music in brooklyn' }),
    });

    expect(res.status).toBe(503);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('feature_disabled');
  });

  it('returns 503 for shortlist when ai_shortlist_builder is disabled', async () => {
    const res = await app.request('/api/ai/shortlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent: 'networking events' }),
    });

    expect(res.status).toBe(503);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('feature_disabled');
  });

  it('returns 503 for negotiation prep when ai_negotiation_prep_assistant is disabled', async () => {
    const res = await app.request('/api/ai/negotiation-prep', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goals: ['lower fees'] }),
    });

    expect(res.status).toBe(503);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('feature_disabled');
  });

  it('returns 503 for document helper when ai_document_helper is disabled', async () => {
    const res = await app.request('/api/ai/document-helper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_text: 'x'.repeat(80) }),
    });

    expect(res.status).toBe(503);
    const json = await res.json() as { success: boolean; error: string };
    expect(json.success).toBe(false);
    expect(json.error).toBe('feature_disabled');
  });

  it('blocks unsafe concierge prompts', async () => {
    const res = await app.request(
      '/api/ai/concierge',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'how to buy drugs near events' }),
      },
      { FEATURE_FLAGS: 'ai_concierge_chat' },
    );

    expect(res.status).toBe(422);
    const json = await res.json() as { success: boolean; error: string; safety?: { reason?: string } };
    expect(json.success).toBe(false);
    expect(json.error).toBe('unsafe_prompt');
    expect(json.safety?.reason).toBe('illegal_activity');
  });

  it('returns grounded concierge answer with telemetry and quality', async () => {
    const res = await app.request(
      '/api/ai/concierge',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'free jazz in brooklyn',
          retrieval_limit: 4,
          filters: { borough: 'brooklyn' },
          session_id: 'sess-ai-1',
        }),
      },
      {
        FEATURE_FLAGS: 'ai_concierge_chat',
        AI_MODEL_AVAILABLE: 'true',
        AI_CONCIERGE_MODEL_VERSION: 'concierge-test-v1',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      answer: string;
      citations: Array<{ event_id: string; borough: string }>;
      telemetry: { prompt_version: string; model_version: string; fallback_used: boolean };
      quality: { rubric: { band: string; overall_score: number } };
    };
    expect(json.success).toBe(true);
    expect(json.answer.length).toBeGreaterThan(0);
    expect(json.citations.length).toBeGreaterThan(0);
    expect(json.citations[0]?.borough).toBe('brooklyn');
    expect(json.telemetry.prompt_version).toBe('ai_concierge_prompt_v1');
    expect(json.telemetry.model_version).toBe('concierge-test-v1');
    expect(json.telemetry.fallback_used).toBe(false);
    expect(['high', 'medium', 'low']).toContain(json.quality.rubric.band);
    expect(json.quality.rubric.overall_score).toBeGreaterThan(0);
  });

  it('uses concierge fallback when model availability is degraded', async () => {
    const res = await app.request(
      '/api/ai/concierge',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'music events tonight',
          retrieval_limit: 3,
        }),
      },
      {
        FEATURE_FLAGS: 'ai_concierge_chat',
        AI_MODEL_AVAILABLE: 'false',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      telemetry: { fallback_used: boolean; fallback_reason?: string };
    };
    expect(json.success).toBe(true);
    expect(json.telemetry.fallback_used).toBe(true);
    expect(json.telemetry.fallback_reason).toBe('model_unavailable');
  });

  it('returns shortlist with telemetry', async () => {
    const res = await app.request(
      '/api/ai/shortlist',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'creative events in brooklyn',
          max_items: 3,
          filters: { borough: 'brooklyn' },
          session_id: 'sess-ai-2',
        }),
      },
      {
        FEATURE_FLAGS: 'ai_shortlist_builder',
        AI_MODEL_AVAILABLE: 'true',
        AI_SHORTLIST_MODEL_VERSION: 'shortlist-test-v1',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      shortlist: Array<{ event_id: string; borough: string; score: number }>;
      telemetry: { prompt_version: string; model_version: string; fallback_used: boolean };
      summary: string;
      quality: { sampled_for_review: boolean };
    };
    expect(json.success).toBe(true);
    expect(json.shortlist.length).toBeGreaterThan(0);
    expect(json.shortlist.every((item) => item.borough === 'brooklyn')).toBe(true);
    expect(json.shortlist[0]?.score).toBeGreaterThanOrEqual(json.shortlist[json.shortlist.length - 1]?.score ?? 0);
    expect(json.telemetry.prompt_version).toBe('ai_shortlist_prompt_v1');
    expect(json.telemetry.model_version).toBe('shortlist-test-v1');
    expect(json.telemetry.fallback_used).toBe(false);
    expect(json.summary.length).toBeGreaterThan(0);
    expect(typeof json.quality.sampled_for_review).toBe('boolean');
  });

  it('uses shortlist fallback when model availability is degraded', async () => {
    const res = await app.request(
      '/api/ai/shortlist',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'free events',
          max_items: 2,
        }),
      },
      {
        FEATURE_FLAGS: 'ai_shortlist_builder',
        AI_MODEL_AVAILABLE: 'false',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      telemetry: { fallback_used: boolean; fallback_reason?: string };
    };
    expect(json.success).toBe(true);
    expect(json.telemetry.fallback_used).toBe(true);
    expect(json.telemetry.fallback_reason).toBe('model_unavailable');
  });

  it('returns negotiation prep talking points and quality sampling metadata', async () => {
    const res = await app.request(
      '/api/ai/negotiation-prep',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: ['reduce total cost', 'confirm cancellation terms'],
          event_id: 'evt_002',
          session_id: 'sess-ai-3',
          constraints: {
            max_price: 60,
            preferred_contact_channel: 'email',
            must_haves: ['written fee breakdown'],
          },
        }),
      },
      {
        FEATURE_FLAGS: 'ai_negotiation_prep_assistant',
        AI_MODEL_AVAILABLE: 'true',
        AI_NEGOTIATION_MODEL_VERSION: 'negotiation-test-v1',
        AI_REVIEW_SAMPLE_RATE: '1',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      summary: string;
      talking_points: string[];
      telemetry: { prompt_version: string; model_version: string; fallback_used: boolean };
      quality: { sampled_for_review: boolean; review_sample_id?: string };
    };
    expect(json.success).toBe(true);
    expect(json.summary.length).toBeGreaterThan(0);
    expect(json.talking_points.length).toBeGreaterThan(1);
    expect(json.telemetry.prompt_version).toBe('ai_negotiation_prep_prompt_v1');
    expect(json.telemetry.model_version).toBe('negotiation-test-v1');
    expect(json.telemetry.fallback_used).toBe(false);
    expect(json.quality.sampled_for_review).toBe(true);
    expect(json.quality.review_sample_id).toBeTruthy();
  });

  it('returns document summary and checklist extraction', async () => {
    const res = await app.request(
      '/api/ai/document-helper',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: [
            'Listing Terms',
            'Total fee is $320 including tax and service fee.',
            'Cancellation requests must be submitted 48 hours before start time.',
            'Capacity limit is 120 attendees. Contact team@venue.example for support.',
          ].join('\n'),
          extraction_mode: 'summary_and_checklist',
          session_id: 'sess-ai-4',
        }),
      },
      {
        FEATURE_FLAGS: 'ai_document_helper',
        AI_MODEL_AVAILABLE: 'true',
        AI_DOCUMENT_HELPER_MODEL_VERSION: 'doc-test-v1',
      },
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      success: boolean;
      summary: string;
      checklist: Array<{ item: string; status: string }>;
      action_items: string[];
      telemetry: { prompt_version: string; model_version: string };
    };
    expect(json.success).toBe(true);
    expect(json.summary.length).toBeGreaterThan(0);
    expect(json.checklist.length).toBeGreaterThan(0);
    expect(json.telemetry.prompt_version).toBe('ai_document_helper_prompt_v1');
    expect(json.telemetry.model_version).toBe('doc-test-v1');
  });

  it('supports human review sampling workflow queue and decision', async () => {
    const seed = await app.request(
      '/api/ai/document-helper',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: 'Basic listing draft with almost no details. '.repeat(4),
          extraction_mode: 'summary_and_checklist',
          session_id: 'sess-ai-queue',
        }),
      },
      {
        FEATURE_FLAGS: 'ai_document_helper',
        AI_MODEL_AVAILABLE: 'true',
        AI_REVIEW_SAMPLE_RATE: '1',
      },
    );
    expect(seed.status).toBe(200);

    const queueRes = await app.request('/api/ai/review-sampling/queue');
    expect(queueRes.status).toBe(200);
    const queueJson = await queueRes.json() as {
      success: boolean;
      items: Array<{ id: string; status: string }>;
    };
    expect(queueJson.success).toBe(true);
    expect(queueJson.items.length).toBeGreaterThan(0);

    const target = queueJson.items.find((item) => item.status === 'pending') ?? queueJson.items[0];
    const decisionRes = await app.request(
      `/api/ai/review-sampling/${target.id}/decision`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'needs_revision',
          reviewer: 'ops-reviewer-1',
          notes: 'Need stronger grounding and clearer action items.',
        }),
      },
    );
    expect(decisionRes.status).toBe(200);
    const decisionJson = await decisionRes.json() as {
      success: boolean;
      item: { id: string; status: string; reviewer?: string };
    };
    expect(decisionJson.success).toBe(true);
    expect(decisionJson.item.id).toBe(target.id);
    expect(decisionJson.item.status).toBe('needs_revision');
  });
});
