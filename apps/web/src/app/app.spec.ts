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

  it('hides the nav chrome when signed out', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.topbar')).toBeFalsy();
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
    expect(compiled.querySelector('.topbar')).toBeTruthy();
    expect(compiled.querySelector('.session-badge')?.textContent).toContain('Demo session');

    TestBed.inject(AuthService).logout();
    fixture.detectChanges();
    expect(compiled.querySelector('.topbar')).toBeFalsy();
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
