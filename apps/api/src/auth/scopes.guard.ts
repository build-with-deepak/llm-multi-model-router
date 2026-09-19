import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_SCOPES_KEY } from './scopes.decorator';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Enforces @RequireScopes, reading the `scope` claim the identity service
 * put in the token.
 *
 * This is the anti-abuse boundary for the whole demo suite, and it is
 * deliberately a single check in a single place. The shared demo account
 * carries `demo:read` only, so anyone can try every demo immediately and
 * nobody anonymous can put a file on my disk or a job in a shared Ollama
 * inference queue.
 *
 * The 403 message is written for the visitor, not for a developer: it is
 * the moment someone is told that registering gets them something, and it
 * is the single highest-intent conversion point on the whole site.
 */
@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const granted = String(request.user?.scope ?? '').split(' ').filter(Boolean);
    const missing = required.filter((scope) => !granted.includes(scope));

    if (missing.length > 0) {
      throw new ForbiddenException({
        message:
          'Create a free account to use this — it takes one email and one code. ' +
          'The shared demo account can run every demo, but cannot upload.',
        error: 'Forbidden',
        statusCode: 403,
        // Machine-readable, so the frontend can open the registration panel
        // rather than pattern-matching on the prose above.
        reason: 'insufficient_scope',
        requiredScopes: required,
      });
    }
    return true;
  }
}
