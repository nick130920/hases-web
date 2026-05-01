import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  OverdueApplication,
  statusBadgeClass,
  statusLabel,
} from '../../core/types';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Reportes</h1>
        <p class="page-subtitle">
          Descarga reportes operativos en CSV y vigila los SLA del pipeline.
        </p>
      </header>

      <div class="kpi-grid">
        <a class="kpi-card" [href]="api.reportApplicationsUrl()" target="_blank">
          <span class="kpi-card__icon"><span class="icon">groups</span></span>
          <span class="kpi-card__label">Postulaciones</span>
          <span class="kpi-card__value">CSV</span>
          <span class="kpi-card__hint">listado completo</span>
        </a>
        <a class="kpi-card" [href]="api.reportPipelineTimeUrl()" target="_blank">
          <span class="kpi-card__icon"><span class="icon">schedule</span></span>
          <span class="kpi-card__label">Tiempo medio por estado</span>
          <span class="kpi-card__value">CSV</span>
          <span class="kpi-card__hint">benchmark de pipeline</span>
        </a>
        <a class="kpi-card kpi-card--soft" [href]="api.reportIPSMonthlyUrl()" target="_blank">
          <span class="kpi-card__icon"><span class="icon">medical_services</span></span>
          <span class="kpi-card__label">IPS mensual</span>
          <span class="kpi-card__value">CSV</span>
          <span class="kpi-card__hint">resultados ocupacionales</span>
        </a>
      </div>

      <article class="card card--accent">
        <div class="card-section-head">
          <h2>Onboarding completados</h2>
          <span class="badge badge--soft">por fechas</span>
        </div>
        <form class="filters" style="margin-bottom: 0;" (ngSubmit)="downloadOnboarding()">
          <label>
            Desde
            <input type="date" [(ngModel)]="from" name="from" />
          </label>
          <label>
            Hasta
            <input type="date" [(ngModel)]="to" name="to" />
          </label>
          <button class="btn btn--primary" type="submit">
            <span class="icon icon--sm">download</span>
            Descargar CSV
          </button>
        </form>
      </article>

      <article class="card card--accent-soft">
        <div class="card-section-head">
          <h2>Postulaciones atrasadas (SLA)</h2>
          <span class="badge" [class.badge--error]="overdue().length" [class.badge--success]="!overdue().length">
            {{ overdue().length || 'Sin atrasos' }}{{ overdue().length ? ' atrasadas' : '' }}
          </span>
        </div>
        <p class="page-subtitle" *ngIf="overdue().length">
          Estos casos llevan más tiempo del permitido en su estado actual.
        </p>
        <table class="data-table" *ngIf="overdue().length; else noOverdue">
          <thead>
            <tr>
              <th>Postulante</th>
              <th>Estado</th>
              <th>Días en estado</th>
              <th>SLA máx</th>
              <th>Atraso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let o of overdue()">
              <td>
                <div class="data-table__name">
                  <span class="avatar avatar--sm">{{ initials(o) }}</span>
                  <span>{{ o.first_name }} {{ o.last_name }}</span>
                </div>
              </td>
              <td>
                <span class="badge" [class]="'badge ' + badgeClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </td>
              <td>{{ o.days_in_state }}</td>
              <td>{{ o.sla_max_days }}</td>
              <td>
                <span class="text-error">+{{ o.overdue_by }} día(s)</span>
              </td>
              <td>
                <a [routerLink]="['/applications', o.id]" class="row" style="justify-content:flex-end;">
                  Abrir <span class="icon icon--sm">arrow_forward</span>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #noOverdue>
          <p class="empty">Sin postulaciones atrasadas. Operación al día.</p>
        </ng-template>
      </article>
    </section>
  `,
})
export class ReportsComponent implements OnInit {
  protected readonly api = inject(ApiService);
  overdue = signal<OverdueApplication[]>([]);
  from = '';
  to = '';
  statusLabel = statusLabel;
  badgeClass = statusBadgeClass;

  initials(o: OverdueApplication): string {
    const f = (o.first_name?.[0] ?? '').toUpperCase();
    const l = (o.last_name?.[0] ?? '').toUpperCase();
    return (f + l) || '?';
  }

  ngOnInit(): void {
    this.api.listOverdueApplications().subscribe({ next: (o) => this.overdue.set(o ?? []) });
  }

  downloadOnboarding(): void {
    const url = this.api.reportOnboardingCompletedUrl(this.from || undefined, this.to || undefined);
    window.open(url, '_blank');
  }
}
