import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface SessionPayload {
  /** `demo-<uuid>` — one per demo login, scoping that session's data. */
  sub: string;
  kind: 'demo';
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user: SessionPayload;
}

/**
 * Applied globally (APP_GUARD in app.module.ts); routes opt OUT with
 * @Public() rather than opting in, so a newly added endpoint is protected
 * by default instead of accidentally open.
 *
 * Accepts the token from the Authorization header (normal calls) or a
 * `?token=` query param — the latter exists for EventSource-style consumers
 * that cannot set headers. The main frontend uses fetch-based streaming
 * with a real Authorization header; the query param is a documented escape
 * hatch, not the primary path.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException(
        'Sign in with the demo account to use this endpoint.',
      );
    }

    try {
      request.user = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      throw new UnauthorizedException(
        'Your demo session has expired — sign in again.',
      );
    }
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length);
    const queryToken = request.query['token'];
    return typeof queryToken === 'string' ? queryToken : undefined;
  }
}
