export type SafetyAssessment = {
  safe: boolean;
  reason?: string;
  matched_term?: string;
};

const unsafeTermMap: Array<{ term: string; reason: string }> = [
  { term: 'self harm', reason: 'self_harm_content' },
  { term: 'suicide', reason: 'self_harm_content' },
  { term: 'kill myself', reason: 'self_harm_content' },
  { term: 'buy drugs', reason: 'illegal_activity' },
  { term: 'hard drugs', reason: 'illegal_activity' },
  { term: 'bomb', reason: 'violent_content' },
  { term: 'terrorist', reason: 'violent_content' },
  { term: 'hate crime', reason: 'hateful_content' },
  { term: 'racial slur', reason: 'hateful_content' },
];

export function assessPromptSafety(text: string): SafetyAssessment {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return { safe: true };

  for (const item of unsafeTermMap) {
    if (normalized.includes(item.term)) {
      return {
        safe: false,
        reason: item.reason,
        matched_term: item.term,
      };
    }
  }

  return { safe: true };
}
