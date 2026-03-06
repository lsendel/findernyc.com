import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadSavedSearches,
  renderSavedSearchDeliveryAttempts,
  renderSavedSearches,
  requestSavedSearchDeliveryAttempts,
  requestSendSavedSearchAlert,
  saveSearchAlert,
  type SavedSearchItem,
} from '../../src/assets/js/saved-searches';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('saved searches helpers', () => {
  it('creates a saved alert with email channel and invokes onCreated callback', async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => ({ success: true, id: 73 }),
      status: 201,
      request: init,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const onCreated = vi.fn();
    const saved = await saveSearchAlert({
      query_text: 'networking',
      filters: { borough: 'manhattan' },
      session_id: 'sess_1',
    }, { onCreated });

    expect(saved).toEqual({ success: true, id: 73 });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/saved-searches', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.channel).toBe('email');
    expect(body.query_text).toBe('networking');
  });

  it('renders saved searches and routes action callbacks', () => {
    document.body.innerHTML = '<ul id="list"></ul>';
    const list = document.getElementById('list') as HTMLElement;
    const item: SavedSearchItem = {
      id: 41,
      query_text: 'family events',
      channel: 'email',
      destination: 'family@example.com',
      is_active: true,
      created_at: '2026-03-05T10:00:00.000Z',
    };
    const onSendAlert = vi.fn();
    const onViewAttempts = vi.fn();

    renderSavedSearches(list, [item], { onSendAlert, onViewAttempts });

    expect(list.textContent).toContain('family events (email) → family@example.com');
    const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.map((button) => button.textContent)).toEqual(['Send Alert', 'View Attempts']);

    buttons[0]?.click();
    buttons[1]?.click();
    expect(onSendAlert).toHaveBeenCalledWith(item);
    expect(onViewAttempts).toHaveBeenCalledWith(item);
  });

  it('renders empty states for saved searches and delivery attempts', () => {
    document.body.innerHTML = '<ul id="saved"></ul><ul id="attempts"></ul>';
    const saved = document.getElementById('saved') as HTMLElement;
    const attempts = document.getElementById('attempts') as HTMLElement;

    renderSavedSearches(saved, []);
    renderSavedSearchDeliveryAttempts(attempts, []);

    expect(saved.textContent).toContain('No saved alerts yet.');
    expect(attempts.textContent).toContain('No delivery attempts yet for this alert.');
  });

  it('loads saved searches and falls back to empty on non-ok responses', async () => {
    document.body.innerHTML = '<ul id="list"></ul>';
    const list = document.getElementById('list') as HTMLElement;

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          items: [{
            id: 1,
            query_text: 'music',
            channel: 'email',
            destination: null,
            is_active: true,
            created_at: null,
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
    vi.stubGlobal('fetch', fetchMock);

    await loadSavedSearches(list);
    expect(list.textContent).toContain('music (email)');

    await loadSavedSearches(list);
    expect(list.textContent).toContain('No saved alerts yet.');
  });

  it('requests send-alert and delivery-attempt endpoints with expected methods', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true, items: [] }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const sendResponse = await requestSendSavedSearchAlert(8);
    const attemptsResponse = await requestSavedSearchDeliveryAttempts(8);

    expect(sendResponse.status).toBe(200);
    expect(attemptsResponse.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/saved-searches/8/send-alert', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/saved-searches/8/delivery-attempts', expect.objectContaining({ method: 'GET' }));
  });
});
