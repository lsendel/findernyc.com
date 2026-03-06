import { z } from 'zod';

export const availabilityStatusValues = ['available', 'limited', 'sold_out'] as const;
export type AvailabilityStatus = (typeof availabilityStatusValues)[number];

export type AvailabilitySnapshotItem = {
  status: AvailabilityStatus;
  seats_total?: number;
  seats_remaining?: number;
  updated_at: string;
};

export type AvailabilityStoreItem = AvailabilitySnapshotItem & {
  event_id: string;
  source: 'env' | 'sync';
};

export type AvailabilityBindings = {
  EVENT_AVAILABILITY_JSON?: string;
};

type AvailabilityUpdateInput = {
  event_id: string;
  status?: AvailabilityStatus;
  seats_total?: number;
  seats_remaining?: number;
  updated_at?: string;
};

const envEntrySchema = z.object({
  event_id: z.string().min(1).max(64),
  status: z.enum(availabilityStatusValues).optional(),
  seats_total: z.number().int().positive().optional(),
  seats_remaining: z.number().int().nonnegative().optional(),
  updated_at: z.string().optional(),
}).superRefine((value, ctx) => {
  if (typeof value.seats_total === 'number' && typeof value.seats_remaining === 'number' && value.seats_remaining > value.seats_total) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'seats_remaining_must_not_exceed_seats_total',
      path: ['seats_remaining'],
    });
  }
});

const envPayloadSchema = z.array(envEntrySchema).max(500);

const runtimeOverrides = new Map<string, AvailabilityStoreItem>();

function normalizeTimestamp(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return new Date().toISOString();
  return new Date(parsed).toISOString();
}

function deriveStatus(input: {
  status?: AvailabilityStatus;
  seats_total?: number;
  seats_remaining?: number;
}): AvailabilityStatus {
  if (input.status) return input.status;
  if (typeof input.seats_remaining === 'number') {
    if (input.seats_remaining <= 0) return 'sold_out';
    if (typeof input.seats_total === 'number' && input.seats_total > 0) {
      const ratio = input.seats_remaining / input.seats_total;
      if (ratio <= 0.2) return 'limited';
    }
  }
  return 'available';
}

function normalizeEntry(input: AvailabilityUpdateInput, source: AvailabilityStoreItem['source']): AvailabilityStoreItem {
  const status = deriveStatus(input);
  return {
    event_id: input.event_id,
    status,
    seats_total: input.seats_total,
    seats_remaining: input.seats_remaining,
    updated_at: normalizeTimestamp(input.updated_at),
    source,
  };
}

function parseEnvAvailability(bindings?: AvailabilityBindings): AvailabilityStoreItem[] {
  const raw = bindings?.EVENT_AVAILABILITY_JSON?.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    const validated = envPayloadSchema.safeParse(parsed);
    if (!validated.success) return [];
    return validated.data.map((entry) => normalizeEntry(entry, 'env'));
  } catch {
    return [];
  }
}

export function upsertAvailabilityUpdates(updates: AvailabilityUpdateInput[]): AvailabilityStoreItem[] {
  const normalized = updates.map((update) => normalizeEntry(update, 'sync'));
  for (const item of normalized) {
    runtimeOverrides.set(item.event_id, item);
  }
  return normalized;
}

export function getAvailabilitySnapshot(bindings?: AvailabilityBindings): Record<string, AvailabilitySnapshotItem> {
  const merged = new Map<string, AvailabilityStoreItem>();
  for (const item of parseEnvAvailability(bindings)) {
    merged.set(item.event_id, item);
  }
  for (const [eventId, item] of runtimeOverrides.entries()) {
    merged.set(eventId, item);
  }

  const snapshot: Record<string, AvailabilitySnapshotItem> = {};
  for (const [eventId, item] of merged.entries()) {
    snapshot[eventId] = {
      status: item.status,
      seats_total: item.seats_total,
      seats_remaining: item.seats_remaining,
      updated_at: item.updated_at,
    };
  }
  return snapshot;
}
