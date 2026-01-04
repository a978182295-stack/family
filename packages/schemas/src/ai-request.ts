import { z } from 'zod';

export const AiPromptRequestSchema = z.object({
  prompt: z.string().trim().min(1, '请输入提示内容').max(2000, '内容过长'),
  intent: z.enum(['recipe', 'knowledge', 'travel', 'health']),
});

export type AiPromptRequest = z.infer<typeof AiPromptRequestSchema>;
