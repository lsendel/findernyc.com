import { getCatalogEventById } from '../search/unified-search';

export type InquiryContactChannel = 'email' | 'sms' | 'phone';

export type InquiryProfile = {
  full_name: string;
  email: string;
  phone?: string;
  preferred_contact_channel: InquiryContactChannel;
  note?: string;
};

export type InquiryProfileDraft = Partial<InquiryProfile>;

export type InquiryRecord = {
  id: string;
  event_id: string;
  event_title: string;
  organizer_id: string;
  session_id?: string;
  profile: InquiryProfile;
  message?: string;
  status: 'submitted';
  created_at: string;
};

const savedProfilesBySession = new Map<string, InquiryProfileDraft>();
const inquiriesById = new Map<string, InquiryRecord>();

function compactProfileDraft(input: InquiryProfileDraft | undefined): InquiryProfileDraft {
  if (!input) return {};
  const full_name = typeof input.full_name === 'string' ? input.full_name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  const preferred_contact_channel = input.preferred_contact_channel;

  return {
    ...(full_name ? { full_name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(preferred_contact_channel ? { preferred_contact_channel } : {}),
    ...(note ? { note } : {}),
  };
}

export function getSavedInquiryProfile(sessionId: string): InquiryProfileDraft | undefined {
  const key = sessionId.trim();
  if (!key) return undefined;
  const saved = savedProfilesBySession.get(key);
  return saved ? { ...saved } : undefined;
}

export function upsertSavedInquiryProfile(input: {
  session_id: string;
  profile: InquiryProfileDraft;
}): InquiryProfileDraft {
  const key = input.session_id.trim();
  if (!key) return {};
  const existing = getSavedInquiryProfile(key) ?? {};
  const next = compactProfileDraft({
    ...existing,
    ...compactProfileDraft(input.profile),
  });
  savedProfilesBySession.set(key, next);
  return { ...next };
}

export function composeInquiryProfile(params: {
  session_id?: string;
  profile?: InquiryProfileDraft;
  autofill_from_session: boolean;
}): InquiryProfileDraft {
  const saved = params.autofill_from_session && params.session_id
    ? getSavedInquiryProfile(params.session_id)
    : undefined;
  return compactProfileDraft({
    ...(saved ?? {}),
    ...(params.profile ?? {}),
  });
}

export function finalizeInquiryProfile(draft: InquiryProfileDraft): InquiryProfile | undefined {
  if (!draft.full_name || !draft.email) return undefined;
  return {
    full_name: draft.full_name,
    email: draft.email,
    ...(draft.phone ? { phone: draft.phone } : {}),
    preferred_contact_channel: draft.preferred_contact_channel ?? 'email',
    ...(draft.note ? { note: draft.note } : {}),
  };
}

export function createInquiry(input: {
  event_id: string;
  session_id?: string;
  profile: InquiryProfile;
  message?: string;
}): InquiryRecord | undefined {
  const event = getCatalogEventById(input.event_id);
  if (!event) return undefined;

  const id = `inq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const inquiry: InquiryRecord = {
    id,
    event_id: event.id,
    event_title: event.title,
    organizer_id: event.organizer_id,
    ...(input.session_id ? { session_id: input.session_id } : {}),
    profile: input.profile,
    ...(input.message?.trim() ? { message: input.message.trim() } : {}),
    status: 'submitted',
    created_at: new Date().toISOString(),
  };
  inquiriesById.set(id, inquiry);
  return { ...inquiry };
}

export function getInquiryById(inquiryId: string): InquiryRecord | undefined {
  const inquiry = inquiriesById.get(inquiryId);
  return inquiry ? { ...inquiry, profile: { ...inquiry.profile } } : undefined;
}
