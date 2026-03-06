import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INQUIRY_PROFILE_STORAGE_KEY,
  compactInquiryProfileDraft,
  loadInquiryProfile,
  readStoredInquiryProfile,
  writeStoredInquiryProfile,
} from '../../src/assets/js/inquiry-profile';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageMock());
});

afterEach(() => {
  localStorage.removeItem(INQUIRY_PROFILE_STORAGE_KEY);
  vi.unstubAllGlobals();
});

describe('inquiry profile helpers', () => {
  it('compacts and trims profile draft fields', () => {
    expect(compactInquiryProfileDraft({
      full_name: '  Alex Rivera  ',
      email: '   ',
      phone: ' 555-0100 ',
      preferred_contact_channel: 'sms',
      note: '  Need evening slots  ',
    })).toEqual({
      full_name: 'Alex Rivera',
      phone: '555-0100',
      preferred_contact_channel: 'sms',
      note: 'Need evening slots',
    });
  });

  it('writes and reads sanitized profile draft from localStorage', () => {
    writeStoredInquiryProfile({
      full_name: '  Dana  ',
      email: 'dana@example.com  ',
      note: '  Follow up by email  ',
    });

    expect(readStoredInquiryProfile()).toEqual({
      full_name: 'Dana',
      email: 'dana@example.com',
      note: 'Follow up by email',
    });
  });

  it('ignores malformed stored profile payloads', () => {
    localStorage.setItem(INQUIRY_PROFILE_STORAGE_KEY, JSON.stringify({
      full_name: 123,
      preferred_contact_channel: 'fax',
      note: null,
    }));

    expect(readStoredInquiryProfile()).toEqual({});
  });

  it('loads remote profile with session id and compacts response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        profile: {
          full_name: '  Jamie Lee ',
          preferred_contact_channel: 'email',
          note: '  Keep me posted ',
        },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const profile = await loadInquiryProfile('sess_42+with space');

    expect(fetchMock).toHaveBeenCalledWith('/api/inquiries/profile?session_id=sess_42%2Bwith%20space', expect.objectContaining({
      method: 'GET',
      headers: { Accept: 'application/json' },
    }));
    expect(profile).toEqual({
      full_name: 'Jamie Lee',
      preferred_contact_channel: 'email',
      note: 'Keep me posted',
    });
  });

  it('returns fallback values when remote profile is unavailable', async () => {
    const nonOkFetch = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
    vi.stubGlobal('fetch', nonOkFetch);
    expect(await loadInquiryProfile('sess_non_ok')).toBeNull();

    const missingProfileFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: false }),
    }));
    vi.stubGlobal('fetch', missingProfileFetch);
    expect(await loadInquiryProfile('sess_missing')).toEqual({});

    const throwingFetch = vi.fn(async () => {
      throw new Error('network down');
    });
    vi.stubGlobal('fetch', throwingFetch);
    expect(await loadInquiryProfile('sess_error')).toBeNull();
  });
});
