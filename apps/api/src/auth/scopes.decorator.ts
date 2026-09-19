import { SetMetadata } from '@nestjs/common';

export const REQUIRED_SCOPES_KEY = 'requiredScopes';

/**
 * Declares what a route needs beyond simply being signed in.
 *
 *   @RequireScopes('demo:write')
 *
 * The only scope that currently matters is `demo:write`, and it means one
 * thing: this session may make the server store or ingest something. The
 * shared demo account does not have it.
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);
