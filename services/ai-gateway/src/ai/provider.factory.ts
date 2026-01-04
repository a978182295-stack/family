import type { AIProvider } from './ai-provider.interface';
import type { AIProviderMode } from './ai.types';
import { CloudAIProvider } from './providers/cloud.provider';
import { LocalAIProvider } from './providers/local.provider';
import { MockAIProvider } from './providers/mock.provider';

export function selectProviderMode(): AIProviderMode {
  const mode = (process.env.AI_MODE ?? 'cloud').toLowerCase();
  if (mode === 'local') return 'local';
  if (mode === 'mock') return 'mock';
  return 'cloud';
}

export function createAIProvider(
  cloud: CloudAIProvider,
  local: LocalAIProvider,
  mock: MockAIProvider,
): AIProvider {
  const mode = selectProviderMode();
  if (mode === 'mock') return mock;
  if (mode === 'local') return local;

  const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
  if (isDev && !process.env.CLOUD_API_KEY) {
    return mock;
  }

  return cloud;
}
