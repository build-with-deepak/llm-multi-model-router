import { Component, computed, input } from '@angular/core';

interface DemoLink {
  key: 'rag' | 'router' | 'agent';
  name: string;
  url: string;
  repo: string;
}

/**
 * The build-with-deepak.com brand footer, shared (as a per-repo copy, like
 * the auth module) across all three demo apps.
 *
 * These demos exist as brand promotion for Deepak Kumar Jha — evidence a
 * recruiter can click, not standalone products. So every page carries the
 * route back to the brand: the wordmark, the positioning line, the socials,
 * and cross-links to the sibling demos. The logo sits in a light chip on the
 * dark theme because the artwork is drawn for light backgrounds — the exact
 * pattern build-with-deepak.com's own footer uses.
 */
@Component({
  selector: 'app-brand-footer',
  template: `
    <footer class="brand-footer">
      <div class="brand-inner">
        <a
          class="logo-chip"
          href="https://build-with-deepak.com"
          target="_blank"
          rel="noopener"
          aria-label="build-with-deepak.com home"
        >
          <img src="/build-with-light.png" alt="build-with-deepak.com" class="logo-img" />
        </a>

        <p class="byline">
          Built by <strong>Deepak Kumar Jha</strong> — Senior Full-Stack Engineer · Technical Lead
        </p>
        <p class="tagline">
          A live demo from the <a href="https://build-with-deepak.com" target="_blank" rel="noopener">build-with-deepak.com</a>
          portfolio — production AI engineering, not prototypes.
        </p>

        <div class="social-row">
          <a href="https://www.linkedin.com/in/build-with-deepak" target="_blank" rel="noopener me" aria-label="LinkedIn" title="LinkedIn">
            <svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </a>
          <a href="https://github.com/build-with-deepak" target="_blank" rel="noopener me" aria-label="GitHub" title="GitHub">
            <svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.1 3.3 9.42 7.88 10.95.58.11.79-.25.79-.56 0-.27-.01-1.01-.02-1.98-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.75 1.18 1.75 1.18 1.02 1.75 2.68 1.25 3.34.95.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 015.73 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.24 2.76.12 3.05.73.81 1.17 1.84 1.17 3.1 0 4.42-2.7 5.39-5.27 5.67.41.36.78 1.08.78 2.17 0 1.57-.01 2.83-.01 3.22 0 .31.2.68.8.56A11.53 11.53 0 0023.5 12C23.5 5.66 18.35.5 12 .5z"/></svg>
          </a>
          <a href="https://x.com/DeepakBuilds" target="_blank" rel="noopener me" aria-label="X / Twitter" title="X / Twitter">
            <svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="https://build-with-deepak.hashnode.dev" target="_blank" rel="noopener me" aria-label="Blog on Hashnode" title="Blog">
            <svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M22.351 8.019l-6.37-6.37a5.63 5.63 0 00-7.962 0l-6.37 6.37a5.63 5.63 0 000 7.962l6.37 6.37a5.63 5.63 0 007.962 0l6.37-6.37a5.63 5.63 0 000-7.962zM12 15.953a3.953 3.953 0 110-7.906 3.953 3.953 0 010 7.906z"/></svg>
          </a>
          <a href="mailto:entr.deepakjha@gmail.com" aria-label="Email" title="Email">
            <svg class="icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
          </a>
        </div>

        <nav class="explore-row" aria-label="More from build-with-deepak.com">
          <a href="https://build-with-deepak.com" target="_blank" rel="noopener">Portfolio</a>
          <a href="https://build-with-deepak.com/case-studies" target="_blank" rel="noopener">Case Studies</a>
          <a href="https://build-with-deepak.com/experience" target="_blank" rel="noopener">Experience</a>
          <a href="https://build-with-deepak.com/contact" target="_blank" rel="noopener">Hire Me</a>
        </nav>

        <div class="suite-row">
          <span class="suite-label">The demo suite:</span>
          @for (demo of demos; track demo.key) {
            @if (demo.key === current()) {
              <span class="suite-current">{{ demo.name }} (you're here)</span>
            } @else {
              <a [href]="demo.url" target="_blank" rel="noopener">{{ demo.name }}</a>
            }
          }
          <a class="source-link" [href]="currentRepo()" target="_blank" rel="noopener">View source on GitHub</a>
        </div>
      </div>
    </footer>
  `,
  styles: `
    .brand-footer {
      border-top: 1px solid var(--border);
      background: var(--surface);
      margin-top: 3rem;
    }

    .brand-inner {
      max-width: 44rem;
      margin: 0 auto;
      padding: 2.25rem 1.5rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      text-align: center;
    }

    .logo-chip {
      display: inline-flex;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid var(--border);
      border-radius: 0.9rem;
      padding: 0.6rem 1rem;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);

      &:hover {
        border-color: var(--accent);
      }
    }

    .logo-img {
      height: 3rem;
      width: auto;
      display: block;
    }

    .byline {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      color: var(--text);

      strong {
        font-weight: 700;
      }
    }

    .tagline {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.55;

      a {
        color: var(--accent);
        font-weight: 600;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    .social-row {
      display: flex;
      gap: 1.1rem;
      margin-top: 0.4rem;

      a {
        color: var(--text-muted);
        transition: color 0.15s ease;

        &:hover {
          color: var(--accent);
        }
      }
    }

    .icon {
      height: 1.25rem;
      width: 1.25rem;
      display: block;
    }

    .explore-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.4rem 1.25rem;
      margin-top: 0.35rem;

      a {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-muted);
        text-decoration: none;

        &:hover {
          color: var(--text);
        }
      }
    }

    .suite-row {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: baseline;
      gap: 0.4rem 1rem;
      margin-top: 0.75rem;
      padding-top: 0.9rem;
      border-top: 1px solid var(--border);
      width: 100%;
      font-size: 0.75rem;

      a {
        color: var(--text-muted);
        text-decoration: none;

        &:hover {
          color: var(--accent);
        }
      }
    }

    .suite-label {
      color: var(--text-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 0.65rem;
    }

    .suite-current {
      color: var(--accent);
      font-weight: 600;
    }

    .source-link {
      font-weight: 600;
    }
  `,
})
export class BrandFooterComponent {
  /** Which demo this footer is rendered inside — marks it in the suite row. */
  readonly current = input.required<DemoLink['key']>();

  readonly demos: DemoLink[] = [
    {
      key: 'rag',
      name: 'Privacy-First RAG',
      url: 'https://rag.build-with-deepak.com',
      repo: 'https://github.com/build-with-deepak/rag-privacy-first',
    },
    {
      key: 'router',
      name: 'Multi-Model Router',
      url: 'https://router.build-with-deepak.com',
      repo: 'https://github.com/build-with-deepak/llm-multi-model-router',
    },
    {
      key: 'agent',
      name: 'MCP Agent',
      url: 'https://agent.build-with-deepak.com',
      repo: 'https://github.com/build-with-deepak/mcp-agent-toolkit',
    },
  ];

  readonly currentRepo = computed(
    () => this.demos.find((demo) => demo.key === this.current())!.repo,
  );
}
