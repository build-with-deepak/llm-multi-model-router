import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IDENTITY_BASE_URL } from './identity.config';
import type { CodeSent, RegisterRequest, Session } from './session.models';

/**
 * Session state, backed by id.build-with-deepak.com.
 *
 * This app used to mint its own anonymous `demo-<uuid>` session against its
 * own API. It now holds a session issued by a service it shares with the
 * other two demos, so one account works across all three.
 *
 * Two capabilities matter to the UI and both come from the token rather
 * than from anything this app decides:
 *
 *   isDemo()   — the shared, read-only account
 *   canUpload() — the `demo:write` scope, i.e. a verified account
 *
 * `canUpload` drives what the interface offers. The server enforces the
 * same rule independently (see the API's ScopesGuard) — this is for showing
 * the right thing, never for security.
 */
const STORAGE_KEY = 'bwd_router_session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = IDENTITY_BASE_URL;

  private readonly sessionSignal = signal<Session | null>(restore());

  /**
   * The in-flight refresh, shared by every caller.
   *
   * Refresh tokens rotate on use and the identity service treats a replay
   * as a leak — it revokes the whole chain. So two requests 401-ing at the
   * same moment and each refreshing independently would not merely race:
   * the second would look exactly like a stolen token and sign the visitor
   * out of everything. Collapsing them into one promise is what makes
   * rotation safe to combine with parallel requests.
   */
  private refreshInFlight: Promise<boolean> | null = null;

  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly isDemo = computed(() => this.sessionSignal()?.user.kind === 'demo');
  readonly canUpload = computed(
    () => this.sessionSignal()?.user.scope.includes('demo:write') ?? false,
  );

  get token(): string | null {
    return this.sessionSignal()?.accessToken ?? null;
  }

  /** One click, shared account, read-only. The front door. */
  async demoLogin(): Promise<void> {
    this.store(await firstValueFrom(this.http.post<Session>(`${this.base}/api/auth/demo`, {})));
  }

  /** Step one of registration — the server emails a code. */
  register(request: RegisterRequest, demo?: string): Promise<CodeSent> {
    const query = demo ? `?demo=${encodeURIComponent(demo)}` : '';
    return firstValueFrom(
      this.http.post<CodeSent>(`${this.base}/api/auth/register${query}`, request),
    );
  }

  /** Step two — the code proves the address and the account goes live. */
  async verify(email: string, code: string, demo?: string): Promise<void> {
    const query = demo ? `?demo=${encodeURIComponent(demo)}` : '';
    this.store(
      await firstValueFrom(
        this.http.post<Session>(`${this.base}/api/auth/verify${query}`, { email, code }),
      ),
    );
  }

  requestLoginCode(email: string): Promise<CodeSent> {
    return firstValueFrom(
      this.http.post<CodeSent>(`${this.base}/api/auth/login/code`, { email }),
    );
  }

  async verifyLoginCode(email: string, code: string): Promise<void> {
    this.store(
      await firstValueFrom(
        this.http.post<Session>(`${this.base}/api/auth/login/verify`, { email, code }),
      ),
    );
  }

  /**
   * Swaps the refresh token for a fresh session. Returns false rather than
   * throwing, because every caller's answer to failure is the same: show
   * the sign-in screen.
   *
   * Note the identity service rotates the refresh token on every use and
   * treats a replay as a leak, so the new one must be stored — which
   * `store` does as a matter of course.
   */
  refresh(): Promise<boolean> {
    this.refreshInFlight ??= this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<boolean> {
    const current = this.sessionSignal();
    if (!current) return false;
    try {
      this.store(
        await firstValueFrom(
          this.http.post<Session>(`${this.base}/api/auth/refresh`, {
            refreshToken: current.refreshToken,
          }),
        ),
      );
      return true;
    } catch {
      this.clear();
      return false;
    }
  }

  logout(): void {
    const current = this.sessionSignal();
    if (current) {
      // Best-effort: revoke server-side so the refresh token cannot be
      // reused from a stolen copy. The local session is cleared either way.
      this.http
        .post(`${this.base}/api/auth/signout`, {}, {
          headers: { Authorization: `Bearer ${current.accessToken}` },
        })
        .subscribe({ error: () => undefined });
    }
    this.clear();
  }

  handleUnauthorized(): void {
    this.clear();
  }

  private store(session: Session): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Private browsing, or storage disabled. The session still works for
      // this tab; it just will not survive a refresh.
    }
    this.sessionSignal.set(session);
  }

  private clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* see store() */
    }
    this.sessionSignal.set(null);
  }
}

/**
 * A stored session from an older build — or a half-written one — must not
 * be able to break the app on load. Anything unrecognisable is discarded
 * and the visitor simply sees the sign-in screen.
 */
function restore(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.accessToken || !Array.isArray(parsed.user?.scope)) return null;
    return parsed;
  } catch {
    return null;
  }
}
