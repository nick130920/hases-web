import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { OverdueApplication, statusLabel } from '../../core/types';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Reportes</h1>
        <p class="page-subtitle">Descarga reportes operativos y revisa SLAs.</p>
      </header>

      <div class="kpi-grid">
        <a class="kpi-card" [href]="api.reportApplicationsUrl()">
          <span class="kpi-card__value">CSV</span>
          <span class="kpi-card__label">Postulaciones</span>
        </a>
        <a class="kpi-card" [href]="api.reportPipelineTimeUrl()">
          <span class="kpi-card__value">CSV</span>
          <span class="kpi-card__label">Tiempo medio por estado</span>
        </a>
        <a class="kpi-card" [href]="api.reportIPSMonthlyUrl()">
          <span class="kpi-card__value">CSV</span>
          <span class="kpi-card__label">IPS mensual</span>
        </a>
      </div>

      <article class="card">
        <h2>Onboarding completados</h2>
        <form class="filters" (ngSubmit)="downloadOnboarding()">
          <label>
            Desde
            <input type="date" [(ngModel)]="from" name="from" />
          </label>
          <label>
            Hasta
            <input type="date" [(ngModel)]="to" name="to" />
          </label>
          <button class="btn btn--primary" type="submit">Descargar CSV</button>
        </form>
      </article>

      <article class="card">
        <h2>Postulaciones atrasadas (SLA)</h2>
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
              <td>{{ o.first_name }} {{ o.last_name }}</td>
              <td><span class="badge">{{ statusLabel(o.status) }}</span></td>
              <td>{{ o.days_in_state }}</td>
              <td>{{ o.sla_max_days }}</td>
              <td>+{{ o.overdue_by }} día(s)</td>
              <td><a [routerLink]="['/applications', o.id]">Abrir</a></td>
            </tr>
          </tbody>
        </table>
        <ng-template #noOverdue>
          <p class="empty">Sin postulaciones atrasadas.</p>
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

  ngOnInit(): void {
    this.api.listOverdueApplications().subscribe({ next: (o) => this.overdue.set(o ?? []) });
  }

  downloadOnboarding(): void {
    const url = this.api.reportOnboardingCompletedUrl(this.from || undefined, this.to || undefined);
    window.open(url, '_blank');
  }
}
