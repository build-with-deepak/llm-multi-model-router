import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DemoSession } from './models';

const STORAGE_KEY = 'router_demo_token';

/**
 * Demo-session auth state.
 *
 * The token lives in localStorage so a page refresh doesn't end the
 * session, and in a signal so components react to login/logout without a
 * store library. Expiry is handled reactively rather than proactively: the
 * API answers 401 when the token ages out, the interceptor calls
 * `handleUnauthorized()`, and the user lands back on the login screen with
 * one click to a fresh session. A demo session dying after its 2 hours is
 * expected lifecycle, not an error to engineer around.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly tokenSignal = signal<string | null>(
    localStorage.getItem(STORAGE_KEY),
  );

  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

  get token(): string | null {
    return this.tokenSignal();
  }

  async demoLogin(): Promise<void> {
    const session = await firstValueFrom(
      this.http.post<DemoSession>('/api/auth/demo', {}),
    );
    localStorage.setItem(STORAGE_KEY, session.accessToken);
    this.tokenSignal.set(session.accessToken);
  }

  /**
   * Auto-starts a demo session with zero clicks if one isn't already
   * running. Run from an APP_INITIALIZER (see app.config.ts) so it resolves
   * before the router evaluates any guard — a recruiter landing on this
   * demo from a LinkedIn link should see the playground itself, not a
   * click-through gate in front of it. Failures are swallowed here on
   * purpose: `authGuard` is the fallback that sends a visitor to `/login`
   * (which retries this same call) if the API happened to be unreachable
   * at boot.
   */
  async ensureSession(): Promise<void> {
    if (this.isAuthenticated()) return;
    try {
      await this.demoLogin();
    } catch {
      // Swallowed — authGuard redirects to /login, which offers a manual
      // retry and a visible error instead of a silent dead app.
    }
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.tokenSignal.set(null);
  }

  handleUnauthorized(): void {
    this.logout();
  }
}
