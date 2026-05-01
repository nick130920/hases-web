import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  ApplicationListItem,
  PIPELINE_STATUSES,
  Vacancy,
  statusBadgeClass,
  statusLabel,
} from '../../core/types';

@Component({
  selector: 'app-applications-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head page-head--with-action">
        <div>
          <h1>Postulaciones</h1>
          <p class="page-subtitle">
            Filtra por vacante, estado del pipeline o busca por nombre/email.
          </p>
        </div>
        <div class="row">
          <span class="badge badge--neutral">{{ items().length }} resultados</span>
        </div>
      </header>

      <form class="filters" (ngSubmit)="apply()">
        <label>
          Vacante
          <select [(ngModel)]="filters.vacancy_id" name="vacancy_id">
            <option value="">Todas</option>
            <option *ngFor="let v of vacancies()" [value]="v.id">{{ v.title }}</option>
          </select>
        </label>
        <label>
          Estado
          <select [(ngModel)]="filters.status" name="status">
            <option value="">Todos</option>
            <option *ngFor="let s of statuses" [value]="s.value">{{ s.label }}</option>
          </select>
        </label>
        <label>
          Buscar
          <input [(ngModel)]="filters.q" name="q" placeholder="Nombre o email" />
        </label>
        <button class="btn btn--primary" type="submit">
          <span class="icon icon--sm">filter_alt</span>
          Filtrar
        </button>
      </form>

      <div class="card" *ngIf="items().length; else empty" style="padding:0; overflow:hidden;">
        <table class="data-table" style="border:none; box-shadow:none; border-radius:0;">
          <thead>
            <tr>
              <th>Postulante</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Canal</th>
              <th>Fecha</th>
              <th class="text-right"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of items()">
              <td>
                <div class="data-table__name">
                  <span class="avatar avatar--sm">{{ initials(a) }}</span>
                  <span>
                    {{ a.first_name }} {{ a.last_name }}
                    <small class="text-muted">{{ a.phone || '—' }}</small>
                  </span>
                </div>
              </td>
              <td class="text-muted">{{ a.email }}</td>
              <td>
                <span class="badge" [class]="'badge ' + badgeClass(a.status)">
                  {{ statusLabel(a.status) }}
                </span>
              </td>
              <td>{{ a.channel || '—' }}</td>
              <td class="text-muted">{{ a.created_at | slice : 0 : 10 }}</td>
              <td class="text-right">
                <a [routerLink]="['/applications', a.id]" class="row" style="justify-content:flex-end;">
                  Abrir <span class="icon icon--sm">arrow_forward</span>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty>
        <p class="empty">No se encontraron postulaciones con los filtros aplicados.</p>
      </ng-template>
    </section>
  `,
})
export class ApplicationsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  items = signal<ApplicationListItem[]>([]);
  vacancies = signal<Vacancy[]>([]);
  statuses = PIPELINE_STATUSES;
  filters = { vacancy_id: '', status: '', q: '' };
  statusLabel = statusLabel;
  badgeClass = statusBadgeClass;

  initials(a: ApplicationListItem): string {
    const f = (a.first_name?.[0] ?? '').toUpperCase();
    const l = (a.last_name?.[0] ?? '').toUpperCase();
    return (f + l) || '?';
  }

  ngOnInit(): void {
    this.api.listVacancies().subscribe({ next: (v) => this.vacancies.set(v ?? []) });
    this.apply();
  }

  apply(): void {
    this.api.listApplications(this.filters).subscribe({ next: (v) => this.items.set(v ?? []) });
  }
}
