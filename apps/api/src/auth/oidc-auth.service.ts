import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

@Injectable()
export class OidcAuthService {
  private readonly enabled = this.resolveEnabled();
  private readonly issuer = process.env.OIDC_ISSUER_URL ?? null;
  private readonly audience = process.env.OIDC_AUDIENCE ?? null;
  private readonly jwksUrl = process.env.OIDC_JWKS_URL ?? null;
  private readonly jwks = this.jwksUrl ? createRemoteJWKSet(new URL(this.jwksUrl)) : null;

  isEnabled(): boolean {
    return this.enabled;
  }

  async verify(token: string): Promise<JWTPayload> {
    if (!this.enabled) {
      return {};
    }

    if (!this.issuer || !this.jwks) {
      throw new Error('OIDC config missing (OIDC_ISSUER_URL / OIDC_JWKS_URL).');
    }

    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience ?? undefined,
    });
    return payload;
  }

  private resolveEnabled(): boolean {
    const raw = process.env.AUTH_ENABLED;
    if (raw !== undefined) {
      const value = raw.toLowerCase();
      return value === 'true' || value === '1' || value === 'yes';
    }
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
    return isProd;
  }
}
