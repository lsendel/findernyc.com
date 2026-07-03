import type {
  NewsletterCommand,
  RatingCommand,
  TipCommand,
  ValidationResult,
} from './types';

export interface FeedbackRepository {
  upsertRating(command: RatingCommand): Promise<void>;
  addTip(command: TipCommand): Promise<void>;
  subscribe(command: NewsletterCommand): Promise<'subscribed' | 'already_subscribed'>;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readNumberField(body: Record<string, unknown>, camelKey: string, snakeKey: string): number | undefined {
  const value = body[camelKey] ?? body[snakeKey];
  return typeof value === 'number' ? value : undefined;
}

function readStringField(body: Record<string, unknown>, camelKey: string, snakeKey: string): string | undefined {
  const value = body[camelKey] ?? body[snakeKey];
  return typeof value === 'string' ? value : undefined;
}

export function validateRatingCommand(input: unknown): ValidationResult<RatingCommand> {
  const body = (input ?? {}) as Record<string, unknown>;
  const spotId = readNumberField(body, 'spotId', 'spot_id');
  const score = typeof body.score === 'number' ? body.score : undefined;
  const sessionId = readStringField(body, 'sessionId', 'session_id');

  if (spotId == null) {
    return { ok: false, error: 'spot_id is required' };
  }
  if (score == null || !Number.isInteger(score) || score < 1 || score > 5) {
    return { ok: false, error: 'score must be an integer between 1 and 5' };
  }

  return {
    ok: true,
    value: {
      spotId,
      score,
      sessionId: isNonEmptyString(sessionId) ? sessionId.trim() : undefined,
    },
  };
}

export function validateTipCommand(input: unknown): ValidationResult<TipCommand> {
  const body = (input ?? {}) as Record<string, unknown>;
  const spotId = readNumberField(body, 'spotId', 'spot_id');
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const authorName = readStringField(body, 'authorName', 'author_name');
  const authorArea = readStringField(body, 'authorArea', 'author_area');

  if (spotId == null) {
    return { ok: false, error: 'spot_id is required' };
  }
  if (text.length < 10 || text.length > 500) {
    return { ok: false, error: 'text must be between 10 and 500 characters' };
  }

  return {
    ok: true,
    value: {
      spotId,
      text,
      authorName: isNonEmptyString(authorName) ? authorName.trim() : undefined,
      authorArea: isNonEmptyString(authorArea) ? authorArea.trim() : undefined,
    },
  };
}

export function validateNewsletterCommand(input: unknown): ValidationResult<NewsletterCommand> {
  const body = (input ?? {}) as Partial<NewsletterCommand>;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'valid email is required' };
  }

  return { ok: true, value: { email } };
}

export class FeedbackService {
  constructor(private readonly repository: FeedbackRepository) {}

  recordRating(command: RatingCommand): Promise<void> {
    return this.repository.upsertRating(command);
  }

  submitTip(command: TipCommand): Promise<void> {
    return this.repository.addTip(command);
  }

  subscribe(command: NewsletterCommand): Promise<'subscribed' | 'already_subscribed'> {
    return this.repository.subscribe(command);
  }
}
