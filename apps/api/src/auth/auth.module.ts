import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import type { AppConfig } from '../config/configuration';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<{ app: AppConfig }, true>) => {
        const auth = configService.get('app', { infer: true }).auth;
        return {
          secret: auth.jwtSecret,
          signOptions: {
            // Config carries this as a plain string; jsonwebtoken's type is
            // the `ms`-package template literal ("2h" etc). The value is
            // validated by jsonwebtoken at sign time either way.
            expiresIn: auth.tokenTtl as JwtSignOptions['expiresIn'],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
