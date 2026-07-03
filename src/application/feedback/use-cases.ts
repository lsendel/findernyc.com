import type { FeedbackService } from '../../domain/feedback/service';
import {
  validateNewsletterCommand,
  validateRatingCommand,
  validateTipCommand,
} from '../../domain/feedback/service';
import type { NewsletterCommand, RatingCommand, TipCommand, ValidationResult } from '../../domain/feedback/types';

export function parseRatingInput(input: unknown): ValidationResult<RatingCommand> {
  return validateRatingCommand(input);
}

export function parseTipInput(input: unknown): ValidationResult<TipCommand> {
  return validateTipCommand(input);
}

export function parseNewsletterInput(input: unknown): ValidationResult<NewsletterCommand> {
  return validateNewsletterCommand(input);
}

export async function recordSpotRating(service: FeedbackService, command: RatingCommand): Promise<void> {
  await service.recordRating(command);
}

export async function submitSpotTip(service: FeedbackService, command: TipCommand): Promise<void> {
  await service.submitTip(command);
}

export async function subscribeToNewsletter(
  service: FeedbackService,
  command: NewsletterCommand,
): Promise<'subscribed' | 'already_subscribed'> {
  return service.subscribe(command);
}
