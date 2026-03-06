export type SavedSearchFilters = {
  borough?: 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten_island';
  category?: 'music' | 'food' | 'arts' | 'networking' | 'family' | 'wellness';
};

export type SavedSearchItem = {
  id: number;
  query_text: string;
  channel: string;
  destination?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

type SavedSearchesResponse = {
  success: true;
  items: SavedSearchItem[];
};

type SavedSearchAlertChannel = 'email' | 'sms' | 'push';

type SavedSearchAlertAttempt = {
  channel: SavedSearchAlertChannel;
  provider: string;
  delivery: string;
  success: boolean;
  attempt_count: number;
  status_code?: number | null;
  error?: string | null;
  response_ms?: number | null;
};

export type SavedSearchSendAlertResponse = {
  success: boolean;
  id: number;
  delivery: string;
  provider: string;
  attempt_count: number;
  status_code: number | null;
  selected_channel: SavedSearchAlertChannel;
  channel_attempts: SavedSearchAlertAttempt[];
  sent_at?: string;
  error?: string;
};

export type SavedSearchDeliveryAttemptItem = {
  id: number;
  provider: string;
  success: boolean;
  delivery: string;
  attempt_count: number;
  status_code: number | null;
  error: string | null;
  created_at: string;
};

export type SavedSearchDeliveryAttemptsResponse = {
  success: true;
  items: SavedSearchDeliveryAttemptItem[];
};

export async function saveSearchAlert(
  payload: {
    query_text: string;
    filters?: SavedSearchFilters;
    session_id?: string;
  },
  options?: {
    onCreated?: () => void;
  },
): Promise<{ success: true; id: number } | null> {
  try {
    const response = await fetch('/api/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        channel: 'email',
      }),
    });

    if (!response.ok) return null;
    const data = await response.json() as { success: true; id: number };
    options?.onCreated?.();
    return data;
  } catch {
    return null;
  }
}

export async function requestSendSavedSearchAlert(id: number): Promise<{
  status: number;
  body: SavedSearchSendAlertResponse | { success: false; error: string } | null;
}> {
  try {
    const response = await fetch(`/api/saved-searches/${id}/send-alert`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export async function requestSavedSearchDeliveryAttempts(id: number): Promise<{
  status: number;
  body: SavedSearchDeliveryAttemptsResponse | { success: false; error: string } | null;
}> {
  try {
    const response = await fetch(`/api/saved-searches/${id}/delivery-attempts`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json();
    return { status: response.status, body };
  } catch {
    return { status: 0, body: null };
  }
}

export function renderSavedSearchDeliveryAttempts(container: HTMLElement, items: SavedSearchDeliveryAttemptItem[]): void {
  while (container.firstChild) container.removeChild(container.firstChild);
  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'saved-search-item';
    empty.textContent = 'No delivery attempts yet for this alert.';
    container.appendChild(empty);
    return;
  }

  for (const attempt of items) {
    const li = document.createElement('li');
    li.className = 'saved-search-item';
    li.textContent = `${attempt.created_at} • ${attempt.provider} • ${attempt.delivery} • attempt ${attempt.attempt_count} • ${attempt.success ? 'success' : `failed (${attempt.error ?? 'unknown'})`}`;
    container.appendChild(li);
  }
}

export function renderSavedSearches(
  container: HTMLElement,
  items: SavedSearchItem[],
  handlers?: {
    onSendAlert: (item: SavedSearchItem) => void;
    onViewAttempts: (item: SavedSearchItem) => void;
  },
): void {
  while (container.firstChild) container.removeChild(container.firstChild);

  if (items.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'saved-search-item';
    empty.textContent = 'No saved alerts yet.';
    container.appendChild(empty);
    return;
  }

  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'saved-search-item dashboard-manager-item';
    const meta = document.createElement('span');
    meta.className = 'dashboard-manager-item-meta';
    meta.textContent = `${item.query_text} (${item.channel})${item.destination ? ` → ${item.destination}` : ''}`;
    li.appendChild(meta);

    if (handlers) {
      const actions = document.createElement('div');
      actions.className = 'dashboard-manager-actions';
      const sendButton = document.createElement('button');
      sendButton.type = 'button';
      sendButton.className = 'btn btn-outline tap-target';
      sendButton.textContent = 'Send Alert';
      sendButton.addEventListener('click', () => {
        handlers.onSendAlert(item);
      });
      actions.appendChild(sendButton);

      const attemptsButton = document.createElement('button');
      attemptsButton.type = 'button';
      attemptsButton.className = 'btn btn-outline tap-target';
      attemptsButton.textContent = 'View Attempts';
      attemptsButton.addEventListener('click', () => {
        handlers.onViewAttempts(item);
      });
      actions.appendChild(attemptsButton);
      li.appendChild(actions);
    }

    container.appendChild(li);
  }
}

export async function loadSavedSearches(
  container: HTMLElement,
  handlers?: {
    onSendAlert: (item: SavedSearchItem) => void;
    onViewAttempts: (item: SavedSearchItem) => void;
  },
): Promise<void> {
  try {
    const response = await fetch('/api/saved-searches', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      renderSavedSearches(container, [], handlers);
      return;
    }

    const body = await response.json() as SavedSearchesResponse;
    renderSavedSearches(container, body.items ?? [], handlers);
  } catch {
    renderSavedSearches(container, [], handlers);
  }
}
