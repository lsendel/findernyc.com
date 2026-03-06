import { Hono } from 'hono';
import { z } from 'zod';
import { resolveFeatureFlags } from '../../config/feature-flags';
import {
  getExperimentStatusSnapshot,
  rollbackExperiment,
  type ExperimentId,
} from '../../experiments/framework';

type Env = {
  Bindings: {
    FEATURE_FLAGS?: string;
    FEATURE_FLAGS_JSON?: string;
  };
};

export const experimentsRouter = new Hono<Env>();

const rollbackBodySchema = z.object({
  reason: z.string().min(1).max(255).optional(),
});

function ensureExperimentationEnabled(env: Env['Bindings']): boolean {
  const flags = resolveFeatureFlags(env);
  return flags.experimentation_framework;
}

experimentsRouter.get('/status', (c) => {
  if (!ensureExperimentationEnabled(c.env)) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  return c.json(
    {
      success: true,
      items: getExperimentStatusSnapshot(),
    },
    200,
  );
});

experimentsRouter.post('/:id/rollback', async (c) => {
  if (!ensureExperimentationEnabled(c.env)) {
    return c.json({ success: false, error: 'feature_disabled' }, 503);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }
  const parsed = rollbackBodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'validation_error' }, 422);
  }

  const idRaw = c.req.param('id');
  if (idRaw !== 'ranking_blend_v1' && idRaw !== 'trust_controls_v1') {
    return c.json({ success: false, error: 'not_found' }, 404);
  }
  const result = rollbackExperiment({
    experiment_id: idRaw as ExperimentId,
    reason: parsed.data.reason,
  });
  if (!result.success || !result.experiment) {
    return c.json({ success: false, error: 'not_found' }, 404);
  }

  return c.json(
    {
      success: true,
      item: result.experiment,
      ...(result.reason ? { reason: result.reason } : {}),
    },
    200,
  );
});
