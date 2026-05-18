import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';

// Smoke-test root controller — single GET / for "is the server up?" probes.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Public()
  @Get('/health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
