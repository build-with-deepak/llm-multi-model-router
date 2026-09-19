/**
 * Where this app signs people in.
 *
 * The demo APIs no longer mint tokens — they verify tokens issued here — so
 * the browser talks to the identity service directly. That origin is on
 * identity's CORS allowlist; see identity/src/main.ts.
 *
 * Overridable at build time for local development, where identity runs on
 * localhost:3010 rather than behind TLS on its own subdomain.
 */
export const IDENTITY_BASE_URL =
  (globalThis as { __IDENTITY_BASE_URL__?: string }).__IDENTITY_BASE_URL__ ??
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:3010'
    : 'https://id.build-with-deepak.com');
