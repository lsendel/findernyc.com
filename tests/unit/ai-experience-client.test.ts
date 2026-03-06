import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  requestAccessibilityPreference,
  requestAiConcierge,
  requestAiFollowUpApprove,
  requestAiFollowUpAutomation,
  requestAiFollowUpDispatches,
  requestAiReviewDecision,
  requestExperienceI18n,
  saveAccessibilityPreference,
} from '../../src/assets/js/ai-experience-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ai and experience request client', () => {
  it('sends ai concierge payload as JSON POST', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      json: async () => ({ success: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await requestAiConcierge({
      query: 'find networking events',
      session_id: 'sess_abc',
      retrieval_limit: 5,
      filters: { borough: 'queens', category: 'networking' },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith('/api/ai/concierge', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(firstCall[1].body));
    expect(body).toMatchObject({
      query: 'find networking events',
      session_id: 'sess_abc',
      retrieval_limit: 5,
      filters: { borough: 'queens', category: 'networking' },
    });
  });

  it('requests i18n and accessibility endpoints with encoded params', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await requestExperienceI18n('es-US');
    await requestAccessibilityPreference('session with spaces/+');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/experience/i18n/es-US', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/experience/accessibility/preferences/session%20with%20spaces%2F%2B',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('posts accessibility preference payload', async () => {
    const fetchMock = vi.fn(async () => ({ status: 200, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);

    await saveAccessibilityPreference({
      session_id: 'sess_a11y',
      high_contrast: true,
      reduced_motion: false,
      keyboard_first: true,
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/experience/accessibility/preferences', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(firstCall[1].body));
    expect(body).toEqual({
      session_id: 'sess_a11y',
      high_contrast: true,
      reduced_motion: false,
      keyboard_first: true,
    });
  });

  it('encodes follow-up approval template id and sends recipient id', async () => {
    const fetchMock = vi.fn(async () => ({ status: 200, json: async () => ({ success: true }) }));
    vi.stubGlobal('fetch', fetchMock);

    await requestAiFollowUpApprove({
      template_id: 'tpl v1/email',
      recipient_id: 'lead_11',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/ai/follow-up/templates/tpl%20v1%2Femail/approve', expect.objectContaining({
      method: 'POST',
    }));
    const firstCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(firstCall[1].body));
    expect(body).toEqual({ recipient_id: 'lead_11' });
  });

  it('serializes automation and review decision payloads', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await requestAiFollowUpAutomation({
      recipient_id: 'lead_77',
      template_id: 'template_a',
      event_title: 'Queens Mixer',
      next_step: 'confirm availability',
      session_id: 'sess_77',
    });
    await requestAiFollowUpDispatches('lead_77');
    await requestAiFollowUpDispatches();
    await requestAiReviewDecision({
      sample_id: 'sample_1',
      decision: 'needs_revision',
      reviewer: 'qa@example.com',
      notes: 'Needs better grounding.',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/ai/follow-up-automation', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/ai/follow-up-automation/dispatches?recipient_id=lead_77', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/ai/follow-up-automation/dispatches', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/ai/review-sampling/sample_1/decision', expect.objectContaining({ method: 'POST' }));

    const automationCall = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const automationBody = JSON.parse(String(automationCall[1].body));
    expect(automationBody).toEqual({
      recipient_id: 'lead_77',
      template_id: 'template_a',
      session_id: 'sess_77',
      context: {
        event_title: 'Queens Mixer',
        next_step: 'confirm availability',
      },
    });

    const reviewCall = fetchMock.mock.calls[3] as unknown as [string, RequestInit];
    const reviewBody = JSON.parse(String(reviewCall[1].body));
    expect(reviewBody).toEqual({
      decision: 'needs_revision',
      reviewer: 'qa@example.com',
      notes: 'Needs better grounding.',
    });
  });
});
