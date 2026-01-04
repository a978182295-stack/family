import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './auth.constants';
import { OidcAuthService } from './oidc-auth.service';

type RequestWithUser = Request & { user?: unknown };

@Injectable()
export class OidcAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: OidcAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || !this.auth.isEnabled()) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.auth.verify(token);
      req.user = payload;
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('OIDC config missing')) {
        throw new ServiceUnavailableException(error.message);
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractBearerToken(req: Request): string | null {
    const header = req.headers.authorization ?? '';
    if (typeof header !== 'string') {
      return null;
    }
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token.trim();
  }
}
