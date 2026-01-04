import { Controller, Get } from '@nestjs/common';
import type { AppStatusResponse } from '@family-hub/schemas';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  @Get('/')
  @Public()
  root(): AppStatusResponse {
    return { status: 'ok' };
  }
}
