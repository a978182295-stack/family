import type { AIProvider } from './ai-provider.interface';
import type { AIProviderMode } from './ai.types';
import { CloudAIProvider } from './providers/cloud.provider';
import { LocalAIProvider } from './providers/local.provider';

export function selectProviderMode(): AIProviderMode {
  const mode = (process.env.AI_MODE ?? 'cloud').toLowerCase();
  return mode === 'local' ? 'local' : 'cloud';
}

export function createAIProvider(cloud: CloudAIProvider, local: LocalAIProvider): AIProvider {
  const mode = selectProviderMode();
  return mode === 'local' ? local : cloud;
}
