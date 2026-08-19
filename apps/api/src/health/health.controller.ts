import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

/**
 * Unauthenticated liveness probe for uptime monitoring and the shared
 * status page. Shallow on purpose — same rationale as the sibling demos:
 * a dependency hiccup shouldn't flap the monitor for a process that is
 * otherwise fine.
 */
@Controller('api/health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: 'ok'; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
