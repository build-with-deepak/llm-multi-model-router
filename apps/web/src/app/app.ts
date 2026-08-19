import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { BrandFooterComponent } from './core/brand-footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandFooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  async logout(): Promise<void> {
    this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
