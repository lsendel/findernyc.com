export const INQUIRY_PROFILE_STORAGE_KEY = 'localgems_inquiry_profile_v1';

export type InquiryProfileDraft = {
  full_name?: string;
  email?: string;
  phone?: string;
  preferred_contact_channel?: 'email' | 'sms' | 'phone';
  note?: string;
};

export function compactInquiryProfileDraft(input: InquiryProfileDraft): InquiryProfileDraft {
  const full_name = input.full_name?.trim();
  const email = input.email?.trim();
  const phone = input.phone?.trim();
  const note = input.note?.trim();
  return {
    ...(full_name ? { full_name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(input.preferred_contact_channel ? { preferred_contact_channel: input.preferred_contact_channel } : {}),
    ...(note ? { note } : {}),
  };
}

export function readStoredInquiryProfile(): InquiryProfileDraft {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(INQUIRY_PROFILE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const record = parsed as Record<string, unknown>;
    return compactInquiryProfileDraft({
      ...(typeof record.full_name === 'string' ? { full_name: record.full_name } : {}),
      ...(typeof record.email === 'string' ? { email: record.email } : {}),
      ...(typeof record.phone === 'string' ? { phone: record.phone } : {}),
      ...(record.preferred_contact_channel === 'email'
          || record.preferred_contact_channel === 'sms'
          || record.preferred_contact_channel === 'phone'
        ? { preferred_contact_channel: record.preferred_contact_channel }
        : {}),
      ...(typeof record.note === 'string' ? { note: record.note } : {}),
    });
  } catch {
    return {};
  }
}

export function writeStoredInquiryProfile(profile: InquiryProfileDraft): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(INQUIRY_PROFILE_STORAGE_KEY, JSON.stringify(compactInquiryProfileDraft(profile)));
  } catch {
    // best effort only
  }
}

export async function loadInquiryProfile(session_id?: string): Promise<InquiryProfileDraft | null> {
  try {
    const query = session_id ? `?session_id=${encodeURIComponent(session_id)}` : '';
    const response = await fetch(`/api/inquiries/profile${query}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const body = await response.json() as { success: boolean; profile?: InquiryProfileDraft | null };
    if (!body.success || !body.profile) return {};
    return compactInquiryProfileDraft(body.profile);
  } catch {
    return null;
  }
}
