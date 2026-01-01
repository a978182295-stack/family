import { z } from 'zod';

export const HealthStatusSchema = z.enum(['ok', 'error']);

export const HealthIndicatorEntrySchema = z.record(z.unknown());

export const HealthResponseSchema = z.object({
  status: HealthStatusSchema,
  info: z.record(HealthIndicatorEntrySchema).optional(),
  error: z.record(HealthIndicatorEntrySchema).optional(),
  details: z.record(HealthIndicatorEntrySchema).optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
