import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  ApplicationListItem,
  PIPELINE_STATUSES,
  Vacancy,
  statusBadgeClass,
  statusLabel,
} from '../../core/types';

interface QuickFilter {
  /** Identificador interno del chip (no se persiste en URL). */
  id: string;
  label: string;
  /**
   * Predicado sobre el `status` de la postulación. Si está vacío => "todas".
   * Permite agrupar varios estados del pipeline en un solo chip operativo.
   */
  statuses: string[];
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'all', label: 'Todas', statuses: [] },
  { id: 'docs_review', label: 'Por revisar', statuses: ['docs_review'] },
  { id: 'docs_pending', label: 'Faltan documentos', statuses: ['docs_pending', 'docs_incomplete'] },
  { id: 'interview', label: 'Entrevista', statuses: ['interview_pending', 'interview_done'] },
  {
    id: 'occupational',
    label: 'Ocupacional',
    statuses: ['occ_pending', 'occ_sent', 'occ_result_received'],
  },
  { id: 'decision', label: 'Para decidir', statuses: ['hiring_pending'] },
  {
    id: 'induction',
    label: 'Inducción',
    statuses: [
      'hired',
      'induction_org',
      'induction_org_done',
      'induction_theory',
      'induction_epp_pending',
      'induction_practice',
    ],
  },
  { id: 'closed', label: 'Cerradas', statuses: ['onboarding_complete', 'rejected'] },
];

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
            Filtra rápido por la fase del pipeline o usa los filtros avanzados.
          </p>
        </div>
        <div class="row">
          <span class="badge badge--neutral">{{ items().length }} resultados</span>
        </div>
      </header>

      <!-- Chips de filtro rápido (1 clic) -->
      <div class="filter-chips">
        <button
          *ngFor="let f of quickFilters"
          type="button"
          class="filter-chip"
          [class.is-active]="activeQuickFilter() === f.id"
          (click)="setQuickFilter(f)"
        >
          {{ f.label }}
          <span class="filter-chip__count" *ngIf="quickCount(f) as n">{{ n }}</span>
        </button>
      </div>

      <details class="filters-advanced">
        <summary>Filtros avanzados</summary>
        <form class="filters" (ngSubmit)="apply()">
          <label>
            Vacante
            <select [(ngModel)]="filters.vacancy_id" name="vacancy_id">
              <option value="">Todas</option>
              <option *ngFor="let v of vacancies()" [value]="v.id">{{ v.title }}</option>
            </select>
          </label>
          <label>
            Estado puntual
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
            Aplicar
          </button>
        </form>
      </details>

      <div class="card" *ngIf="filteredItems().length; else empty" style="padding:0; overflow:hidden;">
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
            <tr *ngFor="let a of filteredItems()">
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
  styles: [
    `
      .filters-advanced {
        margin-bottom: 18px;
      }
      .filters-advanced summary {
        cursor: pointer;
        font-size: 0.8125rem;
        font-weight: 700;
        color: var(--color-on-surface-secondary);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 6px 4px;
        list-style: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .filters-advanced summary::-webkit-details-marker {
        display: none;
      }
      .filters-advanced summary::after {
        content: '+';
        font-size: 1rem;
        line-height: 1;
        color: var(--color-primary);
      }
      .filters-advanced[open] summary::after {
        content: '−';
      }
      .filters-advanced .filters {
        margin-top: 10px;
      }
    `,
  ],
})
export class ApplicationsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  items = signal<ApplicationListItem[]>([]);
  vacancies = signal<Vacancy[]>([]);
  statuses = PIPELINE_STATUSES;
  filters = { vacancy_id: '', status: '', q: '' };
  statusLabel = statusLabel;
  badgeClass = statusBadgeClass;
  quickFilters = QUICK_FILTERS;

  /** Chip activo actualmente. Se sincroniza con el query param `status`. */
  activeQuickFilter = signal<string>('all');

  /**
   * Filtrado en cliente para los chips: el endpoint filtra por un solo
   * estado puntual, así que aquí agrupamos varios estados en un mismo chip
   * sin pegarle más al backend.
   */
  filteredItems = computed(() => {
    const chip = this.quickFilters.find((f) => f.id === this.activeQuickFilter());
    if (!chip || chip.statuses.length === 0) return this.items();
    return this.items().filter((a) => chip.statuses.includes(a.status));
  });

  initials(a: ApplicationListItem): string {
    const f = (a.first_name?.[0] ?? '').toUpperCase();
    const l = (a.last_name?.[0] ?? '').toUpperCase();
    return (f + l) || '?';
  }

  quickCount(f: QuickFilter): number | null {
    if (f.statuses.length === 0) return this.items().length || null;
    const n = this.items().filter((a) => f.statuses.includes(a.status)).length;
    return n > 0 ? n : null;
  }

  ngOnInit(): void {
    this.api.listVacancies().subscribe({ next: (v) => this.vacancies.set(v ?? []) });
    const initial = this.route.snapshot.queryParamMap.get('status');
    if (initial) {
      const match = QUICK_FILTERS.find((f) => f.statuses.includes(initial));
      if (match) this.activeQuickFilter.set(match.id);
      this.filters.status = initial;
    }
    this.apply();
  }

  setQuickFilter(f: QuickFilter): void {
    this.activeQuickFilter.set(f.id);
    // Reset filtros avanzados de status para no contradecir el chip.
    this.filters.status = '';
    // Refleja el chip activo en la URL solo cuando es un filtro acotado,
    // útil para enlaces directos desde el dashboard.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: f.statuses.length === 1 ? { status: f.statuses[0] } : { status: null },
      queryParamsHandling: 'merge',
    });
  }

  apply(): void {
    this.api.listApplications(this.filters).subscribe({ next: (v) => this.items.set(v ?? []) });
  }
}
