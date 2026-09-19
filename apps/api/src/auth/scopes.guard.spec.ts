import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { ScopesGuard } from './scopes.guard';

/**
 * The anti-abuse boundary for the whole demo suite, tested directly.
 *
 * If this guard ever lets a `demo:read` session through a `demo:write`
 * route, one anonymous visitor can fill the VPS disk and saturate an
 * inference queue shared with two other demos. That is the failure this
 * file exists to prevent.
 */
const contextWith = (scope: string | undefined): ExecutionContext =>
  ({
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => (scope === undefined ? {} : { user: { scope } }) }),
  }) as unknown as ExecutionContext;

const guardRequiring = (required: string[] | undefined) => {
  const reflector = {
    getAllAndOverride: jest.fn(() => required),
  } as unknown as Reflector;
  return new ScopesGuard(reflector);
};

describe('ScopesGuard', () => {
  it('allows a route that requires no scopes', () => {
    expect(guardRequiring(undefined).canActivate(contextWith('demo:read'))).toBe(true);
    expect(guardRequiring([]).canActivate(contextWith('demo:read'))).toBe(true);
  });

  it('allows a session holding the required scope', () => {
    const guard = guardRequiring(['demo:write']);
    expect(guard.canActivate(contextWith('demo:read demo:write'))).toBe(true);
  });

  it('refuses the shared demo account on a write route', () => {
    const guard = guardRequiring(['demo:write']);
    expect(() => guard.canActivate(contextWith('demo:read'))).toThrow(ForbiddenException);
  });

  it('refuses a request with no scope claim at all', () => {
    const guard = guardRequiring(['demo:write']);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(ForbiddenException);
  });

  // Prefix matching would let a scope named "demo:writeable" satisfy
  // "demo:write". Scopes are whole tokens separated by spaces.
  it('matches whole scope tokens, not prefixes', () => {
    const guard = guardRequiring(['demo:write']);
    expect(() => guard.canActivate(contextWith('demo:writeable'))).toThrow(ForbiddenException);
  });

  it('is not confused by extra whitespace in the claim', () => {
    const guard = guardRequiring(['demo:write']);
    expect(guard.canActivate(contextWith('  demo:read   demo:write  '))).toBe(true);
  });

  it('requires every listed scope, not just one', () => {
    const guard = guardRequiring(['demo:read', 'demo:write']);
    expect(() => guard.canActivate(contextWith('demo:read'))).toThrow(ForbiddenException);
  });

  // The frontend opens its registration panel off this code rather than
  // pattern-matching the prose, so the shape is part of the contract.
  it('reports a machine-readable reason the frontend can act on', () => {
    const guard = guardRequiring(['demo:write']);
    try {
      guard.canActivate(contextWith('demo:read'));
      fail('expected the guard to refuse');
    } catch (err) {
      const body = (err as ForbiddenException).getResponse() as Record<string, unknown>;
      expect(body.reason).toBe('insufficient_scope');
      expect(body.requiredScopes).toEqual(['demo:write']);
      expect(String(body.message)).toContain('free account');
    }
  });
});
