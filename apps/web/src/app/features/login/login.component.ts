import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/**
 * This screen is a fallback, not the primary path. The app-wide
 * APP_INITIALIZER (app.config.ts) already starts a demo session with zero
 * clicks before the router activates anything — most visitors never see
 * this page. A visitor only lands here if that start-up call failed (API
 * unreachable at boot), a session expired mid-use, or they signed out. So
 * this page retries automatically on load; the button stays for the rare
 * case that also fails.
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoggingIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly showRegisterModal = signal(false);

  async ngOnInit(): Promise<void> {
    await this.demoLogin();
  }

  async demoLogin(): Promise<void> {
    if (this.isLoggingIn()) return;
    this.error.set(null);
    this.isLoggingIn.set(true);
    try {
      await this.auth.demoLogin();
      await this.router.navigateByUrl('/');
    } catch {
      this.error.set('Could not start a demo session — please try again.');
    } finally {
      this.isLoggingIn.set(false);
    }
  }
}
