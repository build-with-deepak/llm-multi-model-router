import { randomUUID } from 'node:crypto';
import {
  Controller,
  HttpCode,
  NotImplementedException,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../config/configuration';
import { Public } from './public.decorator';
import type { SessionPayload } from './jwt-auth.guard';

export interface DemoSessionResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: { id: string; name: string; kind: 'demo' };
}

/**
 * Demo-first auth, deliberately.
 *
 * Every visitor gets a real session against the real API with one click —
 * the demo is the product experience, not a video of it. Each login mints a
 * fresh `demo-<uuid>` subject, so two visitors trying the demo at once see
 * their own request history, not each other's, without any account setup.
 *
 * Registration (persistent accounts whose data survives the demo-data
 * cleanup) is a real planned feature, not vapor — the endpoint exists and
 * answers honestly with 501 until it ships, so the frontend's "coming soon"
 * modal reflects what the API actually says rather than a hardcoded string.
 */
@Controller('api/auth')
export class AuthController {
  private readonly tokenTtl: string;

  constructor(
    private readonly jwt: JwtService,
    configService: ConfigService<{ app: AppConfig }, true>,
  ) {
    this.tokenTtl = configService.get('app', { infer: true }).auth.tokenTtl;
  }

  @Public()
  @Post('demo')
  @HttpCode(200)
  async demoLogin(): Promise<DemoSessionResponse> {
    const payload: SessionPayload = {
      sub: `demo-${randomUUID()}`,
      kind: 'demo',
      name: 'Demo User',
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.tokenTtl,
      user: { id: payload.sub, name: payload.name, kind: payload.kind },
    };
  }

  @Public()
  @Post('register')
  register(): never {
    throw new NotImplementedException(
      'Registration with persistent accounts is in progress — coming soon. Use the demo account meanwhile.',
    );
  }
}
