/**
 * Where this demo gets its identity from.
 *
 * This service no longer mints tokens. It verifies them against the JWKS
 * published by id.build-with-deepak.com, which means it holds no signing
 * secret: it can check a signature and cannot forge one. A bug in this
 * service is a bug in this service, not a way to issue itself a session for
 * the other two demos.
 */
export interface IdentityConfig {
  issuer: string;
  jwksUrl: string;
  /** This demo's own audience value, as named in the issued token. */
  audience: string;
}

export const identityConfig = (audience: string): IdentityConfig => {
  const issuer = process.env.IDENTITY_ISSUER ?? 'https://id.build-with-deepak.com';
  return {
    issuer,
    jwksUrl: process.env.IDENTITY_JWKS_URL ?? `${issuer}/.well-known/jwks.json`,
    audience: process.env.IDENTITY_AUDIENCE ?? audience,
  };
};
