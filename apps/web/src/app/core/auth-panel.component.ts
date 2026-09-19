import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from './auth.service';

type Mode = 'choose' | 'register' | 'code' | 'signin' | 'signin-code';

/**
 * The one sign-in surface, shared by all three demos.
 *
 * Three ways in, in deliberate order of friction:
 *
 *   1. Demo account   — one click, nothing to type, read-only
 *   2. Create account — name, email, optional phone, then a code
 *   3. Sign in        — email, then a code
 *
 * The demo account is first and visually primary because most visitors
 * arrive from a LinkedIn post with about thirty seconds of patience, and a
 * demo they never open proves nothing. Registration is offered right next
 * to it with the one concrete reason to bother — uploading your own
 * documents — rather than as an abstract "sign up for more".
 *
 * There is no password field anywhere. The credential is a code sent to the
 * address being registered, which proves the same thing a password plus a
 * verification email proves, without asking someone to invent a secret for
 * a demo site they are trying once.
 */
@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth-card">
      <header class="auth-head">
        <span class="bwd-live-badge">
          <span class="bwd-dot" aria-hidden="true"></span>
          Live system
        </span>
        <h1>{{ heading() }}</h1>
        <p>{{ subheading() }}</p>
      </header>

      @if (error()) {
        <p class="auth-error" role="alert">{{ error() }}</p>
      }

      @switch (mode()) {
        @case ('choose') {
          <button
            type="button"
            class="bwd-btn bwd-btn--primary bwd-btn--block"
            [disabled]="busy()"
            (click)="useDemoAccount()"
          >
            {{ busy() ? 'Opening…' : 'Try it now — demo account' }}
          </button>
          <p class="auth-note">
            No signup. Runs against pre-indexed content, so you can try everything
            immediately. Uploading your own files needs a free account.
          </p>

          <div class="auth-sep"><span>or</span></div>

          <button type="button" class="bwd-btn bwd-btn--ghost bwd-btn--block" (click)="go('register')">
            Create a free account
          </button>
          <button type="button" class="auth-link" (click)="go('signin')">
            Already have one? Sign in
          </button>
        }

        @case ('register') {
          <form (ngSubmit)="submitRegistration()">
            <div class="auth-row">
              <label>
                First name
                <input name="firstName" [(ngModel)]="firstName" required autocomplete="given-name" />
              </label>
              <label>
                Last name
                <input name="lastName" [(ngModel)]="lastName" required autocomplete="family-name" />
              </label>
            </div>
            <label>
              Work or personal email
              <input name="email" type="email" [(ngModel)]="email" required autocomplete="email" />
            </label>
            <label>
              Phone <span class="auth-optional">optional</span>
              <input name="phone" type="tel" [(ngModel)]="phone" autocomplete="tel" />
            </label>

            <button type="submit" class="bwd-btn bwd-btn--primary bwd-btn--block" [disabled]="busy()">
              {{ busy() ? 'Sending a code…' : 'Send me a code' }}
            </button>
          </form>
          <p class="auth-note">
            One email, one six-digit code, no password to invent. Your account works
            across all three demos.
          </p>
          <button type="button" class="auth-link" (click)="go('choose')">← Back</button>
        }

        @case ('signin') {
          <form (ngSubmit)="submitSignIn()">
            <label>
              Email
              <input name="email" type="email" [(ngModel)]="email" required autocomplete="email" />
            </label>
            <button type="submit" class="bwd-btn bwd-btn--primary bwd-btn--block" [disabled]="busy()">
              {{ busy() ? 'Sending a code…' : 'Email me a sign-in code' }}
            </button>
          </form>
          <button type="button" class="auth-link" (click)="go('choose')">← Back</button>
        }

      }

      <!-- Registration and sign-in converge here: both end in "we emailed
           you six digits". One branch rather than a shared <ng-template>,
           because a template outlet for a block used in exactly one place
           is indirection with nothing to show for it. -->
      @if (awaitingCode()) {
        <form (ngSubmit)="submitCode()">
          <label>
            Six-digit code
            <input
              name="code"
              [(ngModel)]="code"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              class="auth-code"
              required
            />
          </label>
          <button type="submit" class="bwd-btn bwd-btn--primary bwd-btn--block" [disabled]="busy()">
            {{ busy() ? 'Checking…' : 'Verify and continue' }}
          </button>
        </form>
        <p class="auth-note">Sent to {{ email }}. It expires in a few minutes.</p>
        <button type="button" class="auth-link" (click)="go('choose')">← Start over</button>
      }
    </div>
  `,
  styles: `
    .auth-card {
      max-width: 26rem;
      margin: 3rem auto;
      padding: 1.75rem;
      border-radius: var(--bwd-radius-lg);
      border: 1px solid var(--bwd-border);
      background: var(--bwd-raised);
      box-shadow: var(--bwd-shadow);
    }

    .auth-head { margin-bottom: 1.25rem; }
    .auth-head h1 {
      margin: 0.85rem 0 0;
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--bwd-ink);
    }
    .auth-head p { margin: 0.5rem 0 0; font-size: 0.9rem; line-height: 1.6; color: var(--bwd-body); }

    form { display: flex; flex-direction: column; gap: 0.85rem; }

    .auth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

    label {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--bwd-ink-soft);
    }

    .auth-optional { font-weight: 500; color: var(--bwd-faint); }

    input {
      padding: 0.65rem 0.75rem;
      border-radius: var(--bwd-radius-sm);
      border: 1px solid var(--bwd-border-strong);
      background: var(--bwd-surface);
      color: var(--bwd-ink);
      font: inherit;
      font-size: 0.9rem;
      font-weight: 400;
    }

    input:focus-visible { outline: 2px solid var(--bwd-accent); outline-offset: 1px; }

    .auth-code {
      font-family: var(--bwd-mono);
      font-size: 1.3rem;
      letter-spacing: 0.4em;
      text-align: center;
    }

    .bwd-btn--block { margin-top: 0.35rem; }

    .auth-note { margin: 0.9rem 0 0; font-size: 0.78rem; line-height: 1.6; color: var(--bwd-muted); }

    .auth-error {
      margin: 0 0 1rem;
      padding: 0.7rem 0.8rem;
      border-radius: var(--bwd-radius-sm);
      border: 1px solid #fecaca;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 0.82rem;
      line-height: 1.55;
    }

    .auth-sep {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1.1rem 0;
      color: var(--bwd-faint);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .auth-sep::before, .auth-sep::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--bwd-border);
    }

    .auth-link {
      display: block;
      width: 100%;
      margin-top: 0.9rem;
      padding: 0.4rem;
      background: none;
      border: none;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--bwd-muted);
      cursor: pointer;
    }
    .auth-link:hover { color: var(--bwd-accent); }

    @media (max-width: 28rem) {
      .auth-card { margin: 1.5rem 1rem; padding: 1.25rem; }
      .auth-row { grid-template-columns: 1fr; }
    }
  `,
})
export class AuthPanelComponent {
  private readonly auth = inject(AuthService);

  /** Tags a registration with the demo it came from, for lead attribution. */
  readonly demo = input<'rag' | 'agent' | 'router'>();

  readonly mode = signal<Mode>('choose');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  firstName = '';
  lastName = '';
  email = '';
  phone = '';
  code = '';

  heading(): string {
    switch (this.mode()) {
      case 'register':
        return 'Create your free account';
      case 'signin':
        return 'Sign in';
      case 'code':
      case 'signin-code':
        return 'Check your email';
      default:
        return 'Try this system';
    }
  }

  subheading(): string {
    switch (this.mode()) {
      case 'register':
        return 'One account works across all three live demos.';
      case 'signin':
        return 'We will email you a one-time code — there is no password.';
      case 'code':
      case 'signin-code':
        return 'Enter the six-digit code we just sent you.';
      default:
        return 'This is a real system running on a real server. Pick how you want in.';
    }
  }

  /** Both code-entry steps render the same form. */
  awaitingCode(): boolean {
    return this.mode() === 'code' || this.mode() === 'signin-code';
  }

  go(mode: Mode): void {
    this.error.set(null);
    this.code = '';
    this.mode.set(mode);
  }

  async useDemoAccount(): Promise<void> {
    await this.run(() => this.auth.demoLogin());
  }

  async submitRegistration(): Promise<void> {
    await this.run(async () => {
      await this.auth.register(
        {
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
          phone: this.phone || undefined,
        },
        this.demo(),
      );
      this.mode.set('code');
    });
  }

  async submitSignIn(): Promise<void> {
    await this.run(async () => {
      await this.auth.requestLoginCode(this.email);
      this.mode.set('signin-code');
    });
  }

  async submitCode(): Promise<void> {
    const signingIn = this.mode() === 'signin-code';
    await this.run(() =>
      signingIn
        ? this.auth.verifyLoginCode(this.email, this.code)
        : this.auth.verify(this.email, this.code, this.demo()),
    );
  }

  /**
   * One place that owns the busy flag and error surfacing, so no path can
   * leave the button stuck on "Sending…" after a failure — which is what a
   * try/finally per handler eventually gets wrong.
   */
  private async run(work: () => Promise<unknown>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await work();
    } catch (err) {
      this.error.set(readError(err));
    } finally {
      this.busy.set(false);
    }
  }
}

/**
 * The server's message is written for the visitor and is usually the most
 * useful thing to show — "that code has expired", "use a work address".
 * Validation failures arrive as an array of strings.
 */
function readError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    const message = (err.error as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message) && message.length > 0) return message[0];
    if (typeof message === 'string' && message) return message;
    if (err.status === 0) {
      return 'Could not reach the sign-in service. Check your connection and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
