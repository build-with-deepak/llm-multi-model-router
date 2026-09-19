import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { IDENTITY_BASE_URL } from './identity.config';

/**
 * Attaches the access token to this app's own API calls, and retries once
 * through a token refresh on a 401.
 *
 * The retry matters more than it used to. Access tokens are an hour, not
 * the old two-hour demo session, and someone reading an architecture page
 * with a tab open will cross that boundary mid-session. Without this they
 * would be bounced to a sign-in screen for a token the app is perfectly
 * able to renew silently.
 *
 * Requests to the identity service are never given a bearer token here:
 * they carry their own credentials, and a 401 from the sign-in endpoints is
 * a wrong code, not an expired session — retrying it would be nonsense.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  if (req.url.startsWith(IDENTITY_BASE_URL)) return next(req);

  const withToken = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withToken(auth.token)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      return from(auth.refresh()).pipe(
        switchMap((renewed) => {
          if (!renewed) {
            auth.handleUnauthorized();
            return throwError(() => err);
          }
          return next(withToken(auth.token));
        }),
      );
    }),
  );
};
