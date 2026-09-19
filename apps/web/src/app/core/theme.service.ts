import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const COOKIE_NAME = 'bwd-theme';
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#0f172a',
};

/**
 * Dark/light theme, shared across the whole suite — this site plus the
 * three demo subdomains.
 *
 * Storage is a cookie, not localStorage. localStorage is scoped per
 * origin, and rag.build-with-deepak.com is a different origin from
 * build-with-deepak.com — a preference saved on one was never visible to
 * the other no matter how identical the CSS was. A cookie written with
 * `Domain=.build-with-deepak.com` is sent to every subdomain, so toggling
 * dark mode here is what a demo sees the next time a page loads there.
 * This same file is duplicated verbatim into each of the three demo
 * repos' `app/core/`, and the cookie name has to stay `bwd-theme` in all
 * four for that to work — see the identical bootstrap script in each
 * app's index.html.
 *
 * The inline bootstrap script in index.html stamps the initial
 * `data-theme` before first paint (no flash of wrong theme); this service
 * takes over from there.
 *
 * Local dev is the one place this cannot sync, and no mechanism could:
 * localhost:4201 and localhost:4202 are different origins by the exact
 * same browser rule that makes the production cookie work everywhere
 * else. Nothing to fix there — it isn't a bug, it's the same-origin
 * boundary.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private mediaQuery: MediaQueryList | null = null;

  /** What the user asked for ('system' = follow the device). */
  readonly preference = signal<ThemePreference>('system');
  /** What is actually applied right now. */
  readonly resolved = signal<ResolvedTheme>('light');

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    const stored = this.readCookie();
    if (stored === 'light' || stored === 'dark') {
      this.preference.set(stored);
    }
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', () => {
      if (this.preference() === 'system') {
        this.apply(this.systemTheme());
      }
    });
    this.apply(this.preference() === 'system' ? this.systemTheme() : (this.preference() as ResolvedTheme));
  }

  toggle(): void {
    this.setPreference(this.resolved() === 'dark' ? 'light' : 'dark');
  }

  setPreference(pref: ThemePreference): void {
    this.preference.set(pref);
    if (this.isBrowser) {
      this.writeCookie(pref === 'system' ? null : pref);
    }
    this.apply(pref === 'system' ? this.systemTheme() : pref);
  }

  private systemTheme(): ResolvedTheme {
    return this.mediaQuery?.matches ? 'dark' : 'light';
  }

  private apply(theme: ResolvedTheme): void {
    this.resolved.set(theme);
    this.document.documentElement.setAttribute('data-theme', theme);
    const meta = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) {
      meta.content = THEME_COLORS[theme];
    }
  }

  private readCookie(): string | null {
    const match = this.document.cookie.match(/(?:^|;\s*)bwd-theme=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * One year, SameSite=Lax (not Strict — Strict would drop the cookie on
   * the cross-subdomain navigation a visitor makes clicking from the
   * portfolio into a demo, since that's a top-level cross-site GET).
   *
   * The domain attribute is only set on the real subdomains — a Domain
   * attribute of "localhost" is rejected by browsers outright, and even a
   * correct one could not make local ports share storage; see the class
   * doc comment.
   */
  private writeCookie(value: ThemePreference | null): void {
    const host = this.isBrowser ? location.hostname : '';
    const domain = host.endsWith('build-with-deepak.com') ? '; Domain=.build-with-deepak.com' : '';
    if (value === null) {
      this.document.cookie = `${COOKIE_NAME}=; Path=/${domain}; Max-Age=0; SameSite=Lax`;
    } else {
      this.document.cookie = `${COOKIE_NAME}=${value}; Path=/${domain}; Max-Age=31536000; SameSite=Lax`;
    }
  }
}
