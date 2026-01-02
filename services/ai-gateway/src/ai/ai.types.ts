export type AIProviderMode = 'cloud' | 'local';

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface GenerateTextRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateTextResponse {
  content: string;
  usage?: Record<string, number>;
  raw?: unknown;
}

export interface ProviderMeta {
  mode: AIProviderMode;
  name: string;
  version?: string;
}

export interface AIProviderStatus {
  meta: ProviderMeta;
  ready: boolean;
  details?: Record<string, unknown>;
}
