import { Component, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { ThemeService } from './theme.service';

/**
 * The suite header, shared verbatim by all three demos.
 *
 * Same markup and the same `bwd-*` classes as build-with-deepak.com's own
 * header — that is the point. Before this, one demo had a header component
 * and the other two inlined their own copy in app.html, and all three had
 * quietly diverged.
 *
 * Three jobs, in priority order:
 *   1. get the visitor back to the portfolio (these demos exist to make one
 *      person hireable, so the route home has to survive every screen),
 *   2. show which of the three systems they are in and offer the other two,
 *   3. retain account controls without competing with the task at hand.
 */
@Component({
  selector: 'app-demo-header',
  standalone: true,
  template: `
    <header class="bwd-head">
      <div class="bwd-head-inner">
        <a class="bwd-brand" href="https://build-with-deepak.com" target="_blank" rel="noopener"
           aria-label="build-with-deepak.com — Deepak Kumar Jha">
          <img src="/build-with-light.png" alt="Build with Deepak" class="bwd-brand-logo" />
        </a>

        <nav class="bwd-nav" aria-label="The demo suite">
          @for (item of suite; track item.key) {
            @if (item.key === current) {
              <span class="bwd-nav-link active" aria-current="page">{{ item.name }}</span>
            } @else {
              <a class="bwd-nav-link" [href]="item.url">{{ item.name }}</a>
            }
          }
        </nav>

        <div class="bwd-head-actions">
          <!--
            Order matches the main site's header exactly for the shared part
            — avail badge, then CTA, then the theme toggle — so the toggle
            sits in the same visual slot on every page in the suite. It used
            to come first here, ahead of the avail badge, which is what made
            it feel like it "moved" when navigating from build-with-deepak.com
            into a demo. The demo-only additions (session state, sign out)
            are appended after the shared block instead of interleaved with
            it, for the same reason.
          -->
          <a class="bwd-avail" href="https://build-with-deepak.com/contact" target="_blank" rel="noopener">
            <span class="bwd-dot" aria-hidden="true"></span>
            <span class="bwd-avail-text"><strong>Available for Hire</strong><small>Full-time · Contract · Remote</small></span>
          </a>

          <a class="bwd-btn bwd-btn--primary bwd-head-cta"
             href="https://build-with-deepak.com/Deepak_Kumar_Jha_Technical_Lead.pdf"
             target="_blank" rel="noopener noreferrer">
            Download CV
          </a>

          <button
            type="button"
            class="bwd-icon-btn"
            (click)="theme.toggle()"
            [attr.aria-label]="theme.resolved() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            [attr.title]="theme.resolved() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (theme.resolved() === 'dark') {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            }
          </button>

          @if (auth.isAuthenticated()) {
            @if (!auth.isDemo()) {
              <span class="session-chip">{{ auth.user()?.firstName }} · full access</span>
            }
            <button type="button" class="signout" (click)="auth.logout()">Sign out</button>
          }
        </div>
      </div>
    </header>
  `,
  styles: `
    .bwd-head {
      position: sticky;
      top: 0;
      z-index: 50;
      background: color-mix(in srgb, var(--bwd-surface) 88%, transparent);
      backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--bwd-border);
    }

    .bwd-head-inner {
      max-width: 76rem;
      margin: 0 auto;
      padding: 0.7rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }

    .bwd-brand { display: inline-flex; align-items: center; flex-shrink: 0; }
    .bwd-brand-logo { height: 2.5rem; width: auto; max-width: 15rem; display: block; }

    .bwd-nav { display: flex; align-items: center; gap: 0.25rem; flex: 1; }

    .bwd-nav-link {
      padding: 0.5rem 0.8rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--bwd-body);
      text-decoration: none;
      white-space: nowrap;
    }

    .bwd-nav-link:hover { color: var(--bwd-ink); background: var(--bwd-sunken); }
    .bwd-nav-link.active { color: var(--bwd-accent); background: var(--bwd-accent-bg); }

    .bwd-head-actions { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }

    .bwd-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 0.5rem;
      border: none;
      background: none;
      color: var(--bwd-muted);
      cursor: pointer;
      flex-shrink: 0;
    }
    .bwd-icon-btn:hover { background: var(--bwd-sunken); color: var(--bwd-ink); }
    .bwd-icon-btn svg { width: 1.1rem; height: 1.1rem; }

    /* Full-access state remains visible without taking attention from the
       workspace. Demo-account limits belong in the page explanation. */
    .session-chip {
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      border: 1px solid var(--bwd-live-border);
      background: var(--bwd-live-bg);
      color: var(--bwd-live);
      font-size: 0.7rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .bwd-avail {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid var(--bwd-live-border);
      background: var(--bwd-live-bg);
      color: var(--bwd-live);
      text-decoration: none;
    }

    .bwd-avail-text { display: flex; flex-direction: column; line-height: 1.25; }
    .bwd-avail-text strong { font-size: 0.78rem; font-weight: 700; }
    .bwd-avail-text small { font-size: 0.65rem; opacity: 0.85; font-weight: 600; }

    .bwd-head-cta { padding: 0.6rem 1.1rem; font-size: 0.875rem; }

    .signout {
      background: none;
      border: none;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--bwd-muted);
      cursor: pointer;
      padding: 0.35rem;
    }
    .signout:hover { color: var(--bwd-accent); }

    @media (max-width: 68rem) {
      .bwd-nav { display: none; }
    }

    @media (max-width: 48rem) {
      .bwd-head-inner { padding: 0.6rem 1rem; gap: 0.75rem; flex-wrap: wrap; }
      .bwd-avail, .bwd-head-cta { display: none; }
      .bwd-head-actions { margin-left: auto; }
    }
  `,
})
export class DemoHeaderComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);

  /** Replaced per repo at install time. */
  readonly current: 'rag' | 'agent' | 'router' = 'router';

  readonly suite = [
    { key: 'rag', name: 'Privacy-First RAG', url: 'https://rag.build-with-deepak.com' },
    { key: 'agent', name: 'MCP Agent', url: 'https://agent.build-with-deepak.com' },
    { key: 'router', name: 'Multi-Model Router', url: 'https://router.build-with-deepak.com' },
  ] as const;
}
