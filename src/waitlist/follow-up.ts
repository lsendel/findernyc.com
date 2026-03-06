import {
  resolveIntakeFollowUpDecision,
  type IntakeFollowUpDecision,
  type IntakeFollowUpPriority,
  type IntakeFollowUpRoute,
  type IntakeTeamSize,
  type IntakeUseCase,
} from '../intake/routing';

export type WaitlistUseCase = IntakeUseCase;
export type WaitlistTeamSize = IntakeTeamSize;
export type WaitlistFollowUpRoute = IntakeFollowUpRoute;
export type WaitlistFollowUpPriority = IntakeFollowUpPriority;
export type WaitlistFollowUpDecision = IntakeFollowUpDecision;

export function resolveWaitlistFollowUpDecision(input: {
  use_case?: WaitlistUseCase;
  team_size?: WaitlistTeamSize;
  goal?: string;
}): WaitlistFollowUpDecision {
  return resolveIntakeFollowUpDecision(input);
}

export async function dispatchWaitlistFollowUpAutomation(input: {
  webhook_url?: string;
  auth_token?: string;
  provider_name?: string;
  payload: {
    email: string;
    city?: string;
    zip_code?: string;
    use_case?: WaitlistUseCase;
    team_size?: WaitlistTeamSize;
    goal?: string;
    route: WaitlistFollowUpRoute;
    priority: WaitlistFollowUpPriority;
    submitted_at: string;
  };
}): Promise<{
  status: 'queued' | 'not_configured' | 'failed';
  provider: string;
}> {
  const provider = input.provider_name?.trim() || 'waitlist_follow_up';
  const url = input.webhook_url?.trim();
  if (!url) {
    return { status: 'not_configured', provider };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const authToken = input.auth_token?.trim();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        trigger: 'waitlist_intent',
        provider,
        payload: input.payload,
      }),
    });
    return {
      status: response.ok ? 'queued' : 'failed',
      provider,
    };
  } catch {
    return { status: 'failed', provider };
  }
}
