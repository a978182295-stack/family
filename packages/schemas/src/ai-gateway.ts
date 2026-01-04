import { z } from 'zod';

export const AIProviderModeSchema = z.enum(['cloud', 'local', 'mock']);

export const ChatRoleSchema = z.enum(['system', 'user', 'assistant']);

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string(),
});

export const GenerateTextRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

export const GenerateTextResponseSchema = z.object({
  content: z.string(),
  usage: z.record(z.number()).optional(),
  raw: z.unknown().optional(),
});

export const ProviderMetaSchema = z.object({
  mode: AIProviderModeSchema,
  name: z.string(),
  version: z.string().optional(),
});

export const AIProviderStatusSchema = z.object({
  meta: ProviderMetaSchema,
  ready: z.boolean(),
  details: z.record(z.unknown()).optional(),
});

export type AIProviderMode = z.infer<typeof AIProviderModeSchema>;
export type ChatRole = z.infer<typeof ChatRoleSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type GenerateTextRequest = z.infer<typeof GenerateTextRequestSchema>;
export type GenerateTextResponse = z.infer<typeof GenerateTextResponseSchema>;
export type ProviderMeta = z.infer<typeof ProviderMetaSchema>;
export type AIProviderStatus = z.infer<typeof AIProviderStatusSchema>;
