import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { AuthService } from './core/auth.service';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('keeps the brand header — logo, CV, LinkedIn, profile — visible even when signed out', async () => {
    // The header used to be wrapped in @if (auth.isAuthenticated()), which
    // meant a visitor landing before (or after a failure of) the silent
    // demo-session bootstrap saw no brand chrome at all — the one thing this
    // app exists to never hide. Only the nav and the session badge/sign-out
    // stay behind the auth check now.
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar')).toBeTruthy();
    expect(compiled.querySelector('.topbar-logo img')).toBeTruthy();
    expect(compiled.querySelector('.cv-button')).toBeTruthy();
    expect(compiled.querySelector('.nav')).toBeFalsy();
    expect(compiled.querySelector('.session-badge')).toBeFalsy();

    const hrefs = Array.from(compiled.querySelectorAll('.topbar a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('https://www.linkedin.com/in/build-with-deepak/');
  });

  it('shows nav and a demo-session badge once a token exists', async () => {
    localStorage.setItem('router_demo_token', 'header.payload.signature');
    // AuthService reads localStorage at construction; a fresh injector picks
    // up the token we just planted.
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.nav')).toBeTruthy();
    expect(compiled.querySelector('.session-badge')?.textContent).toContain('Demo session');

    TestBed.inject(AuthService).logout();
    fixture.detectChanges();
    expect(compiled.querySelector('.topbar')).toBeTruthy();
    expect(compiled.querySelector('.session-badge')).toBeFalsy();
  });

  it('carries the build-with-deepak.com brand footer with socials', async () => {
    
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const footer = compiled.querySelector('app-brand-footer');
    expect(footer).toBeTruthy();
    expect(footer?.querySelector('img[alt="build-with-deepak.com"]')).toBeTruthy();

    const hrefs = Array.from(footer?.querySelectorAll('a') ?? []).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('https://www.linkedin.com/in/build-with-deepak');
    expect(hrefs).toContain('https://github.com/build-with-deepak');
    expect(hrefs).toContain('https://build-with-deepak.com');
    expect(hrefs).toContain('mailto:entr.deepakjha@gmail.com');
  });
});
