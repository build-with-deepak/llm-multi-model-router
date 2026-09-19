import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from 'jose';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface SessionClaims {
  /** The account id at the identity service. Scopes this session's data. */
  sub: string;
  email: string;
  name: string;
  kind: 'user' | 'demo';
  /** Space-delimited, per OAuth 2. See ScopesGuard. */
  scope: string;
  email_verified: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: SessionClaims;
}

/**
 * Verifies the access token issued by id.build-with-deepak.com.
 *
 * Applied globally (APP_GUARD in app.module.ts); routes opt OUT with
 * @Public() rather than opting in, so an endpoint added later is protected
 * by forgetting to think about it rather than exposed by it.
 *
 * `createRemoteJWKSet` fetches the key set once and caches it, with its own
 * cooldown on refetching — so verification is a local signature check on the
 * hot path, not a network call per request, and the identity service being
 * briefly unavailable does not take this demo down with it.
 *
 * The token may also arrive as `?token=` for EventSource-style consumers
 * that cannot set headers. The frontend uses fetch-based streaming with a
 * real Authorization header; the query param is a documented escape hatch.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService<Record<string, unknown>, true>,
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
      throw new UnauthorizedException('Sign in to use this endpoint.');
    }

    const identity = (
      this.configService.get('app', { infer: true }) as {
        identity: { issuer: string; jwksUrl: string; audience: string };
      }
    ).identity;

    this.jwks ??= createRemoteJWKSet(new URL(identity.jwksUrl));

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: identity.issuer,
        audience: identity.audience,
      });
      request.user = payload as unknown as SessionClaims;
    } catch (err) {
      // A token this service cannot verify because it cannot REACH the key
      // set is not an invalid token. Answering 401 there would sign every
      // visitor out over a transient network blip; 503 says "try again",
      // which is the truth.
      if (
        err instanceof joseErrors.JWKSNoMatchingKey ||
        (err as { code?: string }).code === 'ERR_JWKS_TIMEOUT' ||
        (err as Error).name === 'JWKSTimeout'
      ) {
        this.logger.error(`Could not reach the identity key set: ${String(err)}`);
        throw new ServiceUnavailableException(
          'Sign-in is temporarily unavailable. Please try again in a moment.',
        );
      }
      throw new UnauthorizedException('Your session has expired — sign in again.');
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
