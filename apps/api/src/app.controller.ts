import { Controller, Get } from '@nestjs/common';
import type { AppStatusResponse } from '@family-hub/schemas';

@Controller()
export class AppController {
  @Get('/')
  root(): AppStatusResponse {
    return { status: 'ok' };
  }
}
