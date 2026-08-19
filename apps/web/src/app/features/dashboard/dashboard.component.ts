import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DashboardStats } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly stats = signal<DashboardStats | null>(null);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.error.set(null);
    try {
      this.stats.set(
        await firstValueFrom(this.http.get<DashboardStats>('/api/dashboard')),
      );
    } catch {
      this.error.set(
        'Could not load dashboard stats — the database may be unreachable.',
      );
    }
  }

  formatUsd(value: number): string {
    return `$${value.toFixed(4)}`;
  }
}
