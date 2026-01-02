import { z } from 'zod';

export const AppStatusResponseSchema = z.object({
  status: z.literal('ok'),
});

export type AppStatusResponse = z.infer<typeof AppStatusResponseSchema>;
