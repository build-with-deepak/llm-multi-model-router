import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    /*
     * No session bootstrap any more.
     *
     * This used to mint an anonymous demo session during app init, so the
     * playground route activated with a session already in place and the
     * visitor never saw a sign-in screen. That made sense when a "session"
     * was a throwaway uuid this app issued itself.
     *
     * Sessions now come from id.build-with-deepak.com and mean something:
     * a shared read-only demo account, or a verified account that may
     * upload. Silently choosing the first on the visitor's behalf would
     * hide the choice — and hide the account that is the entire point of
     * the sign-in screen. The auth guard sends them to /login, which offers
     * the demo account as its primary, one-click action.
     */
  ],
};
