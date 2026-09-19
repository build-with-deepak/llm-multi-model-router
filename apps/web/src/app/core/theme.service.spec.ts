import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

/** Removes only the cookie this service owns, leaving the test runner's own cookies alone. */
function clearThemeCookie(): void {
  document.cookie = 'bwd-theme=; Path=/; Max-Age=0; SameSite=Lax';
}

function readThemeCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)bwd-theme=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

describe('ThemeService', () => {
  let matchMediaListeners: ((e: MediaQueryListEvent) => void)[];
  let matchesDark: boolean;

  beforeEach(() => {
    clearThemeCookie();
    matchMediaListeners = [];
    matchesDark = false;

    // jsdom (this suite's test environment) does not implement
    // window.matchMedia at all, unlike a real browser — vi.spyOn requires
    // the property to already exist, so it is defined outright rather
    // than spied on.
    vi.stubGlobal(
      'matchMedia',
      (): MediaQueryList =>
        ({
          get matches() {
            return matchesDark;
          },
          addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
            matchMediaListeners.push(cb);
          },
          removeEventListener: () => undefined,
        }) as unknown as MediaQueryList,
    );

    document.documentElement.removeAttribute('data-theme');
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#ffffff');
    document.head.appendChild(meta);
  });

  afterEach(() => {
    clearThemeCookie();
    vi.unstubAllGlobals();
  });

  it('defaults to light when the system has no dark preference and nothing is stored', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.resolved()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('follows the system preference when it is dark and nothing is stored', () => {
    matchesDark = true;
    const service = TestBed.inject(ThemeService);
    expect(service.resolved()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('an explicit stored preference overrides the system preference', () => {
    matchesDark = true;
    document.cookie = 'bwd-theme=light; Path=/; SameSite=Lax';
    const service = TestBed.inject(ThemeService);
    expect(service.preference()).toBe('light');
    expect(service.resolved()).toBe('light');
  });

  // The cookie, not localStorage, is the whole point of this rewrite: it is
  // what lets rag.build-with-deepak.com see a preference set on
  // build-with-deepak.com, which no localStorage-based scheme ever could,
  // since the two are different origins.
  it('toggle() flips between light and dark and persists the choice in the cookie', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.resolved()).toBe('light');

    service.toggle();
    expect(service.resolved()).toBe('dark');
    expect(readThemeCookie()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    service.toggle();
    expect(service.resolved()).toBe('light');
    expect(readThemeCookie()).toBe('light');
  });

  it('setPreference("system") clears the stored choice and follows the OS', () => {
    matchesDark = true;
    const service = TestBed.inject(ThemeService);
    service.setPreference('dark');
    expect(readThemeCookie()).toBe('dark');

    service.setPreference('system');
    expect(readThemeCookie()).toBeNull();
    expect(service.resolved()).toBe('dark'); // system happens to be dark here
  });

  it('updates the theme-color meta tag to match the resolved theme', () => {
    const service = TestBed.inject(ThemeService);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
    expect(meta.content).toBe('#ffffff');

    service.setPreference('dark');
    expect(meta.content).toBe('#0f172a');
  });

  it('re-applies the system theme on a media query change while preference is "system"', () => {
    const service = TestBed.inject(ThemeService);
    expect(service.resolved()).toBe('light');

    matchesDark = true;
    matchMediaListeners.forEach((cb) => cb({} as MediaQueryListEvent));
    expect(service.resolved()).toBe('dark');
  });

  it('ignores a media query change while an explicit preference is set', () => {
    const service = TestBed.inject(ThemeService);
    service.setPreference('light');

    matchesDark = true;
    matchMediaListeners.forEach((cb) => cb({} as MediaQueryListEvent));
    expect(service.resolved()).toBe('light');
  });

  // Vitest serves specs from a jsdom document whose hostname does not end in
  // "build-with-deepak.com" — so on this host the cookie must be written
  // WITHOUT a Domain attribute. A Domain attribute of "localhost" is
  // rejected by the browser outright, which would silently drop every
  // write and look identical to "theme never persists".
  it('does not set a cookie Domain attribute on a non-suite host', () => {
    const service = TestBed.inject(ThemeService);
    service.setPreference('dark');
    // If a bad Domain attribute had been sent, the browser would have
    // rejected the whole Set-Cookie and this read would come back empty.
    expect(readThemeCookie()).toBe('dark');
  });
});
