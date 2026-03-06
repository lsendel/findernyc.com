export type ListingVerificationStatus = 'verified' | 'pending' | 'unverified';

export type ListingVerification = {
  status: ListingVerificationStatus;
  badge_label: string;
  verified_at?: string;
  verification_method?: 'manual' | 'trusted_partner' | 'document_check';
  trust_score: number;
};

const organizerVerificationMap: Record<string, ListingVerification> = {
  org_bedford_sessions: {
    status: 'verified',
    badge_label: 'Verified organizer',
    verified_at: '2026-01-15T10:30:00.000Z',
    verification_method: 'manual',
    trust_score: 92,
  },
  org_midtown_founders: {
    status: 'pending',
    badge_label: 'Verification pending',
    verification_method: 'document_check',
    trust_score: 61,
  },
  org_market_collective: {
    status: 'verified',
    badge_label: 'Verified organizer',
    verified_at: '2026-02-02T14:20:00.000Z',
    verification_method: 'trusted_partner',
    trust_score: 95,
  },
  org_bronx_arts_alliance: {
    status: 'verified',
    badge_label: 'Verified organizer',
    verified_at: '2026-01-25T09:00:00.000Z',
    verification_method: 'manual',
    trust_score: 89,
  },
  org_hudson_wellness: {
    status: 'verified',
    badge_label: 'Verified organizer',
    verified_at: '2026-02-08T12:10:00.000Z',
    verification_method: 'document_check',
    trust_score: 86,
  },
  org_northside_gallery: {
    status: 'unverified',
    badge_label: 'Unverified organizer',
    trust_score: 48,
  },
};

export function getListingVerificationForOrganizer(organizerId: string): ListingVerification {
  const matched = organizerVerificationMap[organizerId];
  if (matched) return matched;
  return {
    status: 'unverified',
    badge_label: 'Unverified organizer',
    trust_score: 40,
  };
}
