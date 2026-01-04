import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { OidcAuthGuard } from './oidc-auth.guard';
import { OidcAuthService } from './oidc-auth.service';

@Module({
  providers: [
    OidcAuthService,
    OidcAuthGuard,
    {
      provide: APP_GUARD,
      useClass: OidcAuthGuard,
    },
  ],
})
export class AuthModule {}
