import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import type { Session } from './core/session.models';
import { PlaygroundComponent } from './features/playground/playground.component';

const STORAGE_KEY = 'bwd_router_session';

/**
 * A stored session, as AuthService restores it. `scope` is the field that
 * matters — it is what the UI reads to decide what to offer, and what the
 * API independently enforces.
 */
const session = (scope: string[]): Session => ({
  accessToken: 'header.payload.signature',
  refreshToken: 'refresh-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 'u1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    kind: scope.includes('demo:write') ? 'user' : 'demo',
    scope,
  },
});

const signIn = (scope: string[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session(scope)));

describe('App', () => {

  // DemoHeaderComponent now injects ThemeService, whose constructor calls
  // window.matchMedia — which jsdom (this suite's test environment) does
  // not implement. A real browser always has it; this stub exists only to
  // let component trees mount in tests, not because the app needs one.
  beforeEach(() => {
    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }),
      });
    }
    document.cookie = 'bwd-theme=; Path=/; Max-Age=0; SameSite=Lax';
  });
  async function setup(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // A stub for the one route the shell navigates to itself: signing
        // out goes to /login, and an empty route table makes that a
        // NG04002 rather than the sign-out this test is about.
        provideRouter([{ path: 'login', children: [] }]),
      ],
    }).compileComponents();
  }

  async function setupPlayground(): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PlaygroundComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('should create the app', async () => {
    await setup();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  /**
   * The header and footer render unconditionally, including on the sign-in
   * screen. These demos exist to make one person hireable, so the route
   * back to the portfolio has to survive every screen — a visitor who never
   * signs in must still be able to find out whose work this is.
   */
  it('carries the shared suite chrome even when signed out', async () => {
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-demo-header')).toBeTruthy();
    expect(compiled.querySelector('app-demo-footer')).toBeTruthy();
  });

  it('links the footer back to the portfolio, the source and a way to make contact', async () => {
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const footer = (fixture.nativeElement as HTMLElement).querySelector('app-demo-footer');
    const hrefs = Array.from(footer?.querySelectorAll('a') ?? []).map((a) =>
      a.getAttribute('href'),
    );

    expect(hrefs).toContain('https://build-with-deepak.com');
    expect(hrefs).toContain('https://www.linkedin.com/in/build-with-deepak');
    expect(hrefs).toContain('mailto:entr.deepakjha@gmail.com');
    // The footer is now byte-identical to build-with-deepak.com's own —
    // that is the whole point of this pass — and that footer links to the
    // GitHub org, not any one repo.
    expect(hrefs).toContain('https://github.com/build-with-deepak');
  });

  it('keeps the demo account state out of the top navigation', async () => {
    signIn(['demo:read']);
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance.auth.isDemo()).toBe(true);
    expect(fixture.componentInstance.auth.canUpload()).toBe(false);
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('app-demo-header')
        ?.textContent,
    ).not.toContain('Demo account · read-only');
  });

  it('renders the router title and demo account limit on the playground', async () => {
    signIn(['demo:read']);
    await setupPlayground();
    const fixture = TestBed.createComponent(PlaygroundComponent);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.page-header .eyebrow')?.textContent).toContain('Multi-Model Router');
    expect(host.querySelector('.page-header h1')?.textContent).toContain(
      'Route every request to the right AI model',
    );
    expect(host.querySelector('.page-header .subtitle')?.textContent).toContain(
      'local and cloud models',
    );
    const explanation = host.querySelector('.explainer-panel');
    expect(explanation?.textContent).toContain('What this demonstrates');
    expect(explanation?.textContent).toContain('Demo account:');
    expect(explanation?.textContent).toContain('read-only');
  });

  it('labels a verified session as full access', async () => {
    signIn(['demo:read', 'demo:write']);
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance.auth.isDemo()).toBe(false);
    expect(fixture.componentInstance.auth.canUpload()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('full access');
  });

  it('signing out clears the stored session', async () => {
    signIn(['demo:read', 'demo:write']);
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    await fixture.componentInstance.logout();
    fixture.detectChanges();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(fixture.componentInstance.auth.isAuthenticated()).toBe(false);
  });

  // A session written by an older build must not break the current one.
  it('ignores an unrecognisable stored session', async () => {
    localStorage.setItem(STORAGE_KEY, '{"accessToken":"old-style-token"}');
    await setup();
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.componentInstance.auth.isAuthenticated()).toBe(false);
  });
});
