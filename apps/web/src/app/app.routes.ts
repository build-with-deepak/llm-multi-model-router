import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
    title: 'Sign in — Multi-Model Router · build-with-deepak.com',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/playground/playground.component').then(
        (m) => m.PlaygroundComponent,
      ),
    title: 'Playground — Multi-Model Router · build-with-deepak.com',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    title: 'Dashboard — Multi-Model Router · build-with-deepak.com',
  },
  { path: '**', redirectTo: '' },
];
