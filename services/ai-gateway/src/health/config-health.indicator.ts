import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { AIErrorCode } from '@family-hub/schemas';

type Mode = 'cloud' | 'local' | 'mock';

@Injectable()
export class ConfigHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const rawMode = (process.env.AI_MODE ?? 'cloud').toLowerCase();
    const mode: Mode | 'invalid' =
      rawMode === 'cloud'
        ? 'cloud'
        : rawMode === 'local'
          ? 'local'
          : rawMode === 'mock'
            ? 'mock'
            : 'invalid';

    const missing: string[] = [];

    const isDev = (process.env.NODE_ENV ?? 'development') !== 'production';
    if (mode === 'cloud') {
      if (!process.env.CLOUD_API_KEY && !isDev) missing.push('CLOUD_API_KEY');
    } else if (mode === 'local') {
      if (!process.env.LOCAL_LLM_ENDPOINT) missing.push('LOCAL_LLM_ENDPOINT');
    } else if (mode === 'mock') {
      // mock mode does not require any external config
    } else {
      missing.push('AI_MODE');
    }

    const ok = mode !== 'invalid' && missing.length === 0;

    const details: Record<string, unknown> = {
      mode,
      missing,
      // 不泄露敏感值：仅给出布尔/非敏感信息，方便前端展示与排查
      hasCloudApiKey: Boolean(process.env.CLOUD_API_KEY),
      mockEnabled: mode === 'mock' || (isDev && mode === 'cloud' && !process.env.CLOUD_API_KEY),
      localEndpoint: process.env.LOCAL_LLM_ENDPOINT ?? null,
      cloudTextModel: process.env.CLOUD_TEXT_MODEL ?? null,
      cloudVisionModel: process.env.CLOUD_VISION_MODEL ?? null,
    };

    if (!ok) {
      details.aiErrorCode = AIErrorCode.CONFIG_MISSING;
    }

    return this.getStatus(key, ok, details);
  }
}
