import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration, { AppConfig } from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ScopesGuard } from './auth/scopes.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { DbModule } from './db/db.module';
import { HealthController } from './health/health.controller';
import { RouterModule } from './router/router.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ app: AppConfig }, true>) => {
        const rateLimit = configService.get('app', { infer: true }).rateLimit;
        return {
          throttlers: [{ ttl: rateLimit.ttlMs, limit: rateLimit.limit }],
        };
      },
    }),
    AuthModule,
    DbModule,
    RouterModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: throttling runs before auth so an unauthenticated
    // flood is rejected by the cheaper guard first.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // After JwtAuthGuard, which is what puts the `scope` claim on the
    // request this one reads. Guards run in registration order.
    { provide: APP_GUARD, useClass: ScopesGuard },
  ],
})
export class AppModule {}
