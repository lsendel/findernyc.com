import { waitlist_entries } from '../db/schema';
import type {
  IntakeFollowUpPriority,
  IntakeFollowUpRoute,
  IntakeTeamSize,
  IntakeUseCase,
} from './routing';

export type IntakeSubmissionChannel = 'lead_capture' | 'contact_waitlist';

export function resolveIntakeFollowUpStatus(channel: IntakeSubmissionChannel): string {
  return channel === 'lead_capture' ? 'pending_lead_capture' : 'pending_contact_waitlist';
}

export function buildIntakeSubmissionRecord(input: {
  email: string;
  zip_code?: string;
  city?: string;
  use_case?: IntakeUseCase;
  team_size?: IntakeTeamSize;
  goal?: string;
  route: IntakeFollowUpRoute;
  priority: IntakeFollowUpPriority;
  channel: IntakeSubmissionChannel;
}): typeof waitlist_entries.$inferInsert {
  return {
    email: input.email,
    zip_code: input.zip_code,
    city: input.city,
    use_case: input.use_case,
    team_size: input.team_size,
    goal: input.goal,
    follow_up_route: input.route,
    follow_up_priority: input.priority,
    follow_up_status: resolveIntakeFollowUpStatus(input.channel),
  };
}
