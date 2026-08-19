#!/usr/bin/env node
/**
 * Manual version of the in-app hourly cleanup cron: deletes demo request
 * history older than RETENTION_DAYS (default 7), keeping seed rows. Useful
 * when the API is down but the data still needs cleaning, or from a host
 * cron independent of the app's lifecycle.
 *
 *   DATABASE_URL=postgres://... RETENTION_DAYS=7 node scripts/db-cleanup.mjs
 */
import pg from 'pg';

const url = process.env.DATABASE_URL ?? 'postgres://router:router@localhost:5432/router';
const days = Number(process.env.RETENTION_DAYS ?? 7);
const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  const result = await client.query(
    `DELETE FROM requests
     WHERE seed = false
       AND created_at < now() - make_interval(days => $1)`,
    [days],
  );
  console.log(`[db-cleanup] removed ${result.rowCount} demo request(s) older than ${days} day(s).`);
} catch (err) {
  console.error(`[db-cleanup] failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
