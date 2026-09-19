import { Component } from '@angular/core';

/**
 * The suite footer — byte-identical in structure and styling to
 * build-with-deepak.com's own FooterComponent, hand-copied into each of
 * the three demo apps. Same two bands, same spacing, same three columns
 * (Live systems / The engineer / Hiring), same bottom bar — a visitor
 * scrolling to the bottom of any page in the suite sees the same footer
 * at the same height, not three lookalikes that quietly drifted.
 *
 * The one real difference: every link here is an external `<a href>`
 * rather than an Angular `routerLink`, because this app has no route for
 * /about or /experience — those pages exist only on build-with-deepak.com.
 * The closer CTA buttons link to the main site's /contact page rather than
 * opening the contact modal build-with-deepak.com uses, for the same
 * reason — that modal, and the SmartCMS lead-posting behind it, lives in
 * one repo only.
 */
@Component({
  selector: 'app-demo-footer',
  standalone: true,
  template: `
    <section class="bwd-closer">
      <div class="bwd-shell">
        <div class="bwd-convert">
          <div>
            <span class="bwd-live-badge">
              <span class="bwd-dot" aria-hidden="true"></span>
              Available for new opportunities
            </span>
            <h2 class="bwd-closer-title">Have a system that needs an architect?</h2>
            <p class="bwd-closer-copy">
              I'm open to full-time roles, contract engagements and product/architecture work.
              Everything on this site is a system I designed, built, deployed and still operate —
              the next one could be yours.
            </p>
            <div class="bwd-cta-row">
              <a class="bwd-btn bwd-btn--primary" href="https://build-with-deepak.com/contact" target="_blank" rel="noopener">
                I'm Hiring
              </a>
              <a class="bwd-btn bwd-btn--ghost" href="https://build-with-deepak.com/contact" target="_blank" rel="noopener">
                I Need an Architect
              </a>
              <a class="bwd-btn bwd-btn--ghost" href="https://build-with-deepak.com/contact" target="_blank" rel="noopener">
                I Have a Project
              </a>
            </div>
          </div>

          <blockquote class="bwd-quote">
            <p>“Give me a problem. I'll architect it, build it, and ship it.”</p>
            <cite>— Deepak Kumar Jha</cite>
          </blockquote>
        </div>
      </div>
    </section>

    <footer class="bwd-foot">
      <div class="bwd-shell bwd-foot-inner">
        <div class="bwd-foot-brand">
          <a href="https://build-with-deepak.com" target="_blank" rel="noopener" aria-label="Build with Deepak — home">
            <img src="/build-with-light.png" alt="Build with Deepak" class="bwd-foot-logo" />
          </a>
          <p class="bwd-foot-line">
            Real systems. Real architecture. Available for the next challenge.
          </p>
          <div class="bwd-social">
            <a href="https://www.linkedin.com/in/build-with-deepak" target="_blank" rel="noopener me" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://github.com/build-with-deepak" target="_blank" rel="noopener me" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.1 3.3 9.42 7.88 10.95.58.11.79-.25.79-.56 0-.27-.01-1.01-.02-1.98-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 015.73 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.24 2.76.12 3.05.73.81 1.17 1.84 1.17 3.1 0 4.42-2.7 5.39-5.27 5.67.41.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.2.68.8.56A11.53 11.53 0 0023.5 12C23.5 5.66 18.35.5 12 .5z"/></svg>
            </a>
            <a href="https://x.com/DeepakBuilds" target="_blank" rel="noopener me" aria-label="X / Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="mailto:entr.deepakjha@gmail.com" aria-label="Email">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
            </a>
          </div>
        </div>

        <nav class="bwd-foot-col" aria-label="Live systems">
          <h3>Live systems</h3>
          <a href="https://build-with-deepak.com/rag" target="_blank" rel="noopener">Privacy-First RAG</a>
          <a href="https://build-with-deepak.com/agent" target="_blank" rel="noopener">MCP Agent Toolkit</a>
          <a href="https://build-with-deepak.com/router" target="_blank" rel="noopener">Multi-Model Router</a>
          <a href="https://build-with-deepak.com/demos" target="_blank" rel="noopener">All demos</a>
        </nav>

        <nav class="bwd-foot-col" aria-label="About Deepak">
          <h3>The engineer</h3>
          <a href="https://build-with-deepak.com/about" target="_blank" rel="noopener">About</a>
          <a href="https://build-with-deepak.com/experience" target="_blank" rel="noopener">Experience</a>
          <a href="https://build-with-deepak.com/skills" target="_blank" rel="noopener">Skills</a>
          <a href="https://build-with-deepak.com/case-studies" target="_blank" rel="noopener">Case studies</a>
        </nav>

        <nav class="bwd-foot-col" aria-label="Hiring">
          <h3>Hiring</h3>
          <a href="https://build-with-deepak.com/contact" target="_blank" rel="noopener">Contact</a>
          <a href="https://build-with-deepak.com/uae" target="_blank" rel="noopener">Dubai / UAE relocation</a>
          <a href="https://build-with-deepak.com/Deepak_Kumar_Jha_Technical_Lead.pdf" target="_blank" rel="noopener">Download CV</a>
          <a href="https://build-with-deepak.com/contact" target="_blank" rel="noopener">Talk to Deepak</a>
        </nav>
      </div>

      <div class="bwd-shell bwd-foot-base">
        <p>© {{ year }} Deepak Kumar Jha · build-with-deepak.com</p>
        <p class="bwd-mono">Designed → built → deployed → operated by one engineer.</p>
      </div>
    </footer>
  `,
  styles: `
    .bwd-closer { padding: 4.5rem 0; background: var(--bwd-surface); }

    .bwd-closer-title {
      margin: 1rem 0 0;
      font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.35rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      color: var(--bwd-ink);
    }

    .bwd-closer-copy {
      margin: 0.85rem 0 0;
      font-size: 0.975rem;
      line-height: 1.65;
      color: var(--bwd-body);
      max-width: 34rem;
    }

    .bwd-quote {
      margin: 0;
      padding: 1.5rem;
      border-radius: var(--bwd-radius-lg);
      border: 1px solid var(--bwd-border);
      background: var(--bwd-raised);
      box-shadow: var(--bwd-shadow);
    }

    .bwd-quote p {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.5;
      color: var(--bwd-ink);
      letter-spacing: -0.015em;
    }

    .bwd-quote cite {
      display: block;
      margin-top: 0.75rem;
      font-style: normal;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--bwd-muted);
    }

    /* ---- footer proper ---- */

    .bwd-foot {
      border-top: 1px solid var(--bwd-border);
      background: var(--bwd-sunken);
    }

    .bwd-foot-inner {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) repeat(3, minmax(0, 1fr));
      gap: 2.5rem;
      padding-top: 3.25rem;
      padding-bottom: 2.5rem;
    }

    .bwd-foot-logo { height: 2.5rem; width: auto; display: block; }

    .bwd-foot-line {
      margin: 1rem 0 0;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--bwd-muted);
      max-width: 22rem;
    }

    .bwd-social { display: flex; gap: 1rem; margin-top: 1.25rem; }

    .bwd-social a { color: var(--bwd-faint); transition: color 0.15s ease; }
    .bwd-social a:hover { color: var(--bwd-accent); }
    .bwd-social svg { width: 1.25rem; height: 1.25rem; display: block; }

    .bwd-foot-col { display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start; }

    .bwd-foot-col h3 {
      margin: 0 0 0.35rem;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--bwd-faint);
    }

    .bwd-foot-col a {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--bwd-body);
      text-decoration: none;
    }

    .bwd-foot-col a:hover { color: var(--bwd-accent); }

    .bwd-foot-base {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1.5rem;
      padding-top: 1.25rem;
      padding-bottom: 1.75rem;
      border-top: 1px solid var(--bwd-border);
    }

    .bwd-foot-base p { margin: 0; font-size: 0.8rem; color: var(--bwd-muted); }

    @media (max-width: 64rem) {
      .bwd-foot-inner { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem; }
    }

    @media (max-width: 40rem) {
      .bwd-closer { padding: 3rem 0; }
      .bwd-foot-inner { grid-template-columns: minmax(0, 1fr); }
    }
  `,
})
export class DemoFooterComponent {
  readonly year = new Date().getFullYear();
}
