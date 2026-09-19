import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthPanelComponent } from '../../core/auth-panel.component';
import { AuthService } from '../../core/auth.service';

/**
 * The /login route, which is now a thin wrapper around the suite's shared
 * sign-in panel rather than its own hand-rolled card.
 *
 * All this adds on top of the panel is the redirect: the panel knows how to
 * get someone signed in, and has no business knowing what this particular
 * app wants to do afterwards.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [AuthPanelComponent],
  template: `<app-auth-panel demo="router" />`,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Covers both arriving here already signed in (a bookmarked /login) and
    // completing a sign-in on this screen, without the panel having to call
    // back into the router.
    effect(() => {
      if (this.auth.isAuthenticated()) void this.router.navigateByUrl('/');
    });
  }
}
