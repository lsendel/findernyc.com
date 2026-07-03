export type RatingCommand = {
  spotId: number;
  score: number;
  sessionId?: string;
};

export type TipCommand = {
  spotId: number;
  text: string;
  authorName?: string;
  authorArea?: string;
};

export type NewsletterCommand = {
  email: string;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };
