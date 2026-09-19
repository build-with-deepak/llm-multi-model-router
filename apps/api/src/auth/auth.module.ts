import { Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ScopesGuard } from './scopes.guard';

/**
 * No controller any more.
 *
 * This demo used to mint its own `demo-<uuid>` sessions and answer
 * `POST /register` with 501. Both moved to id.build-with-deepak.com, so one
 * account works across all three demos and registration is a real feature
 * rather than a promise. What is left here is verification only — see
 * jwt-auth.guard.ts for why this service deliberately cannot issue tokens.
 */
@Module({
  providers: [JwtAuthGuard, ScopesGuard],
  exports: [JwtAuthGuard, ScopesGuard],
})
export class AuthModule {}
