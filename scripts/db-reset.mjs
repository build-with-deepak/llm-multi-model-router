#!/usr/bin/env node
/**
 * Truncates the request log. The API auto-seeds fresh demo history on its
 * next boot against an empty table (see apps/api/src/db/seed.service.ts),
 * so the full reset flow is: run this, restart the api container/process.
 *
 * Kept as a standalone script rather than an admin endpoint on purpose —
 * a public unattended demo should not expose a "delete everything" route,
 * authenticated or otherwise.
 *
 *   DATABASE_URL=postgres://... node scripts/db-reset.mjs
 */
import pg from 'pg';

const url = process.env.DATABASE_URL ?? 'postgres://router:router@localhost:5432/router';
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query('TRUNCATE requests');
  console.log('[db-reset] requests table truncated — restart the API to re-seed.');
} catch (err) {
  console.error(`[db-reset] failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
