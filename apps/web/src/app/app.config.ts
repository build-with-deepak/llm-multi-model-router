import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    // Starts (or resumes) a demo session before the router evaluates any
    // guard — see the doc comment on AuthService.ensureSession(). This is
    // what removes the login click for a first-time visitor: by the time
    // the playground route activates, a session already exists.
    provideAppInitializer(() => inject(AuthService).ensureSession()),
  ],
};
