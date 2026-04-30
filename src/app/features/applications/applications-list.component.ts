import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ApplicationListItem, PIPELINE_STATUSES, Vacancy, statusLabel } from '../../core/types';

@Component({
  selector: 'app-applications-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Postulaciones</h1>
        <p class="page-subtitle">Filtra por vacante o estado del pipeline.</p>
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
        <button class="btn btn--primary" type="submit">Filtrar</button>
      </form>

      <table class="data-table" *ngIf="items().length; else empty">
        <thead>
          <tr><th>Postulante</th><th>Email</th><th>Estado</th><th>Canal</th><th>Fecha</th><th></th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let a of items()">
            <td>{{ a.first_name }} {{ a.last_name }}</td>
            <td>{{ a.email }}</td>
            <td><span class="badge">{{ statusLabel(a.status) }}</span></td>
            <td>{{ a.channel || '—' }}</td>
            <td>{{ a.created_at }}</td>
            <td><a [routerLink]="['/applications', a.id]">Abrir</a></td>
          </tr>
        </tbody>
      </table>
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

  ngOnInit(): void {
    this.api.listVacancies().subscribe({ next: (v) => this.vacancies.set(v ?? []) });
    this.apply();
  }

  apply(): void {
    this.api.listApplications(this.filters).subscribe({ next: (v) => this.items.set(v ?? []) });
  }
}
