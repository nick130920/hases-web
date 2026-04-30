import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ApplicationListItem, Vacancy, statusLabel } from '../../core/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Tablero</h1>
        <p class="page-subtitle" *ngIf="auth.user() as u">
          Bienvenido, {{ u.email }} ({{ u.role }})
        </p>
      </header>

      <div class="kpi-grid">
        <a class="kpi-card" routerLink="/vacancies">
          <span class="kpi-card__value">{{ vacancies().length }}</span>
          <span class="kpi-card__label">Vacantes activas</span>
        </a>
        <a class="kpi-card" routerLink="/applications">
          <span class="kpi-card__value">{{ totalApplications() }}</span>
          <span class="kpi-card__label">Postulaciones totales</span>
        </a>
        <div class="kpi-card kpi-card--soft">
          <span class="kpi-card__value">{{ inProcess() }}</span>
          <span class="kpi-card__label">En proceso activo</span>
        </div>
        <div class="kpi-card kpi-card--soft">
          <span class="kpi-card__value">{{ completed() }}</span>
          <span class="kpi-card__label">Onboarding completo</span>
        </div>
      </div>

      <section class="dashboard-section">
        <h2>Últimas postulaciones</h2>
        <table class="data-table" *ngIf="recent().length; else emptyApps">
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Fecha</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of recent()">
              <td>{{ a.first_name }} {{ a.last_name }}</td>
              <td>{{ a.email }}</td>
              <td><span class="badge">{{ statusLabel(a.status) }}</span></td>
              <td>{{ a.created_at }}</td>
              <td><a [routerLink]="['/applications', a.id]">Abrir</a></td>
            </tr>
          </tbody>
        </table>
        <ng-template #emptyApps>
          <p class="empty">Aún no hay postulaciones registradas.</p>
        </ng-template>
      </section>
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  vacancies = signal<Vacancy[]>([]);
  applications = signal<ApplicationListItem[]>([]);

  totalApplications = () => this.applications().length;
  inProcess = () =>
    this.applications().filter(
      (a) => !['hired', 'rejected', 'onboarding_complete'].includes(a.status)
    ).length;
  completed = () =>
    this.applications().filter((a) => a.status === 'onboarding_complete').length;
  recent = () => this.applications().slice(0, 8);

  statusLabel = statusLabel;

  ngOnInit(): void {
    this.api.listVacancies().subscribe({ next: (v) => this.vacancies.set(v ?? []) });
    this.api
      .listApplications()
      .subscribe({ next: (a) => this.applications.set(a ?? []) });
  }
}
