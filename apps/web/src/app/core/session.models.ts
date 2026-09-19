/** What the identity service returns on a successful sign-in. */
export interface Session {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: SessionUser;
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** `demo` is the shared read-only account; `user` is a verified account. */
  kind: 'user' | 'demo';
  scope: string[];
}

/** Every endpoint that emails a code answers with this, whatever happened. */
export interface CodeSent {
  status: 'code_sent';
  message: string;
  expiresInSeconds: number;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}
