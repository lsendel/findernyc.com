import { Hono } from 'hono';
import { z } from 'zod';
import { createDb } from '../../db/client';
import { waitlist_entries } from '../../db/schema';
import { buildIntakeSubmissionRecord } from '../../intake/persistence';
import { intakeTeamSizeSchema, intakeUseCaseSchema } from '../../intake/routing';
import {
  dispatchWaitlistFollowUpAutomation,
  resolveWaitlistFollowUpDecision,
  type WaitlistTeamSize,
  type WaitlistUseCase,
} from '../../waitlist/follow-up';

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    WAITLIST_AUTOMATION_WEBHOOK_URL?: string;
    WAITLIST_AUTOMATION_WEBHOOK_AUTH_TOKEN?: string;
    WAITLIST_AUTOMATION_PROVIDER_NAME?: string;
  };
};

export const waitlistRouter = new Hono<Env>();

const bodySchema = z.object({
  email: z.string().email(),
  zip_code: z.string().optional(),
  city: z.string().optional(),
  use_case: intakeUseCaseSchema.optional(),
  team_size: intakeTeamSizeSchema.optional(),
  goal: z.string().trim().max(180).optional(),
});

waitlistRouter.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'invalid_json' }, 422);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const { email, zip_code, city, use_case, team_size, goal } = parsed.data;
  const followUp = resolveWaitlistFollowUpDecision({
    use_case: use_case as WaitlistUseCase | undefined,
    team_size: team_size as WaitlistTeamSize | undefined,
    goal,
  });
  const submitted_at = new Date().toISOString();

  const databaseUrl = c.env?.DATABASE_URL ?? '';
  if (databaseUrl) {
    const db = createDb(databaseUrl);
    await db.insert(waitlist_entries).values(buildIntakeSubmissionRecord({
      email,
      zip_code,
      city,
      use_case: use_case as WaitlistUseCase | undefined,
      team_size: team_size as WaitlistTeamSize | undefined,
      goal,
      route: followUp.route,
      priority: followUp.priority,
      channel: 'contact_waitlist',
    }));
  }

  const automation = await dispatchWaitlistFollowUpAutomation({
    webhook_url: c.env?.WAITLIST_AUTOMATION_WEBHOOK_URL,
    auth_token: c.env?.WAITLIST_AUTOMATION_WEBHOOK_AUTH_TOKEN,
    provider_name: c.env?.WAITLIST_AUTOMATION_PROVIDER_NAME,
    payload: {
      email,
      zip_code,
      city,
      use_case: use_case as WaitlistUseCase | undefined,
      team_size: team_size as WaitlistTeamSize | undefined,
      goal,
      route: followUp.route,
      priority: followUp.priority,
      submitted_at,
    },
  });

  return c.json({
    success: true,
    follow_up: {
      route: followUp.route,
      priority: followUp.priority,
      automation_status: automation.status,
      automation_provider: automation.provider,
    },
  }, 201);
});
