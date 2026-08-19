import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isLoggingIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly showRegisterModal = signal(false);

  async demoLogin(): Promise<void> {
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
