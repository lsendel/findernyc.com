import type { FeedbackRepository } from '../../domain/feedback/service';
import type { NewsletterCommand, RatingCommand, TipCommand } from '../../domain/feedback/types';

export class D1FeedbackRepository implements FeedbackRepository {
  constructor(private readonly db: D1Database) {}

  async upsertRating(command: RatingCommand): Promise<void> {
    if (command.sessionId) {
      const existing = await this.db
        .prepare(`SELECT id FROM ratings WHERE spot_id = ? AND session_id = ?`)
        .bind(command.spotId, command.sessionId)
        .first<{ id: number }>();

      if (existing) {
        await this.db
          .prepare(`UPDATE ratings SET score = ? WHERE id = ?`)
          .bind(command.score, existing.id)
          .run();
        return;
      }
    }

    await this.db
      .prepare(`INSERT INTO ratings (spot_id, score, session_id) VALUES (?, ?, ?)`)
      .bind(command.spotId, command.score, command.sessionId ?? null)
      .run();
  }

  async addTip(command: TipCommand): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO spot_tips (spot_id, text, author_name, author_area, approved) VALUES (?, ?, ?, ?, 1)`,
      )
      .bind(command.spotId, command.text, command.authorName ?? null, command.authorArea ?? null)
      .run();
  }

  async subscribe(command: NewsletterCommand): Promise<'subscribed' | 'already_subscribed'> {
    try {
      await this.db
        .prepare(`INSERT INTO newsletter_subscribers (email) VALUES (?)`)
        .bind(command.email)
        .run();
      return 'subscribed';
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE') || message.includes('unique')) {
        return 'already_subscribed';
      }
      throw error;
    }
  }
}
