import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { DashboardService, DashboardStats } from './dashboard.service';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  async stats(@Req() req: AuthenticatedRequest): Promise<DashboardStats> {
    return this.dashboard.stats(req.user.sub);
  }
}
