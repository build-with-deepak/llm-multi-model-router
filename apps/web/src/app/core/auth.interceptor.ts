import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Attaches the demo session token to every API call and funnels 401s back
 * to the login screen. Auth endpoints are skipped — a login request with a
 * stale token attached would be confusing at best.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token;
  const authed =
    token && !req.url.includes('/api/auth/')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        auth.handleUnauthorized();
        void router.navigateByUrl('/login');
      }
      return throwError(() => err);
    }),
  );
};
