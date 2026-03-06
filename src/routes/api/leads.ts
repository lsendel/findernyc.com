import { Hono } from 'hono';
import { z } from 'zod';
import { createDb } from '../../db/client';
import { leads, waitlist_entries } from '../../db/schema';
import { buildIntakeSubmissionRecord } from '../../intake/persistence';
import {
  intakeTeamSizeSchema,
  intakeUseCaseSchema,
  resolveIntakeFollowUpDecision,
  type IntakeTeamSize,
  type IntakeUseCase,
} from '../../intake/routing';
import { dispatchWaitlistFollowUpAutomation } from '../../waitlist/follow-up';

type Env = {
  Bindings: {
    DATABASE_URL?: string;
    WAITLIST_AUTOMATION_WEBHOOK_URL?: string;
    WAITLIST_AUTOMATION_WEBHOOK_AUTH_TOKEN?: string;
    WAITLIST_AUTOMATION_PROVIDER_NAME?: string;
  };
};

export const leadsRouter = new Hono<Env>();

const bodySchema = z.object({
  email: z.string().email(),
  source_cta: z.string().optional(),
  source_section: z.string().optional(),
  use_case: intakeUseCaseSchema.optional(),
  team_size: intakeTeamSizeSchema.optional(),
  city: z.string().max(100).optional(),
  borough: z.enum(['manhattan', 'brooklyn', 'queens', 'bronx', 'staten_island']).optional(),
  goal: z.string().trim().max(180).optional(),
});

leadsRouter.post('/', async (c) => {
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

  const { email, source_cta, source_section, use_case, team_size, city, borough, goal } = parsed.data;
  const followUp = resolveIntakeFollowUpDecision({
    use_case: use_case as IntakeUseCase | undefined,
    team_size: team_size as IntakeTeamSize | undefined,
    goal,
  });
  const normalizedCity = city?.trim();
  const submitted_at = new Date().toISOString();
  const databaseUrl = c.env?.DATABASE_URL ?? '';

  if (!databaseUrl) {
    // Keep lead capture non-blocking in environments where DB bindings are absent.
    const automation = await dispatchWaitlistFollowUpAutomation({
      webhook_url: c.env?.WAITLIST_AUTOMATION_WEBHOOK_URL,
      auth_token: c.env?.WAITLIST_AUTOMATION_WEBHOOK_AUTH_TOKEN,
      provider_name: c.env?.WAITLIST_AUTOMATION_PROVIDER_NAME,
      payload: {
        email,
        city: normalizedCity,
        use_case: use_case as IntakeUseCase | undefined,
        team_size: team_size as IntakeTeamSize | undefined,
        goal,
        route: followUp.route,
        priority: followUp.priority,
        submitted_at,
      },
    });

    return c.json({
      success: true,
      id: 0,
      follow_up: {
        route: followUp.route,
        priority: followUp.priority,
        automation_status: automation.status,
        automation_provider: automation.provider,
      },
    }, 201);
  }

  try {
    const db = createDb(databaseUrl);
    const result = await db
      .insert(leads)
      .values({
        email,
        source_cta,
        source_section,
        use_case,
        team_size,
        city: normalizedCity || undefined,
        borough,
      })
      .returning({ id: leads.id });
    const id = result[0]?.id ?? 0;

    await db.insert(waitlist_entries).values(buildIntakeSubmissionRecord({
      email,
      city: normalizedCity || undefined,
      use_case: use_case as IntakeUseCase | undefined,
      team_size: team_size as IntakeTeamSize | undefined,
      goal,
      route: followUp.route,
      priority: followUp.priority,
      channel: 'lead_capture',
    }));

    const automation = await dispatchWaitlistFollowUpAutomation({
      webhook_url: c.env?.WAITLIST_AUTOMATION_WEBHOOK_URL,
      auth_token: c.env?.WAITLIST_AUTOMATION_WEBHOOK_AUTH_TOKEN,
      provider_name: c.env?.WAITLIST_AUTOMATION_PROVIDER_NAME,
      payload: {
        email,
        city: normalizedCity,
        use_case: use_case as IntakeUseCase | undefined,
        team_size: team_size as IntakeTeamSize | undefined,
        goal,
        route: followUp.route,
        priority: followUp.priority,
        submitted_at,
      },
    });

    return c.json({
      success: true,
      id,
      follow_up: {
        route: followUp.route,
        priority: followUp.priority,
        automation_status: automation.status,
        automation_provider: automation.provider,
      },
    }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string }).code;
    if (code === '23505' || msg.toLowerCase().includes('unique')) {
      return c.json({ success: false, error: 'email_exists' }, 409);
    }
    throw err;
  }
});
