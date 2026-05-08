import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  ApplicationListItem,
  Vacancy,
  statusBadgeClass,
  statusLabel,
} from '../../core/types';

interface FunnelStage {
  key: string;
  label: string;
  icon: string;
  match: (status: string) => boolean;
}

const FUNNEL_STAGES: FunnelStage[] = [
  {
    key: 'applied',
    label: 'Postulado',
    icon: 'how_to_reg',
    match: (s) => ['applied'].includes(s),
  },
  {
    key: 'docs',
    label: 'Documentos',
    icon: 'folder_shared',
    match: (s) => ['docs_pending', 'docs_incomplete', 'docs_review', 'docs_approved'].includes(s),
  },
  {
    key: 'interview',
    label: 'Entrevista',
    icon: 'forum',
    match: (s) => ['interview_pending', 'interview_done'].includes(s),
  },
  {
    key: 'occ',
    label: 'Examen ocupacional',
    icon: 'medical_services',
    match: (s) => ['occ_pending', 'occ_sent', 'occ_result_received', 'hiring_pending'].includes(s),
  },
  {
    key: 'induction',
    label: 'Inducción',
    icon: 'school',
    match: (s) =>
      [
        'hired',
        'induction_org',
        'induction_org_done',
        'induction_theory',
        'induction_epp_pending',
        'induction_practice',
      ].includes(s),
  },
  {
    key: 'onboarding',
    label: 'Onboarding completo',
    icon: 'verified',
    match: (s) => s === 'onboarding_complete',
  },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Tablero</h1>
        <p class="page-subtitle" *ngIf="auth.user() as u">
          Bienvenido <strong>{{ u.email }}</strong> · sesión <em>{{ u.role }}</em>
        </p>
      </header>

      <article class="card card--accent" style="margin-bottom: 22px;">
        <div class="card-section-head">
          <h2>Acciones rápidas</h2>
        </div>
        <div class="quick-actions">
          <a class="quick-action" routerLink="/applications" [queryParams]="{ status: 'docs_review' }">
            <span class="quick-action__icon">
              <span class="icon">fact_check</span>
            </span>
            <span style="flex:1; min-width:0;">
              <span class="quick-action__title">Revisar documentos</span>
              <span class="quick-action__hint">{{ docsToReview() }} en revisión</span>
            </span>
          </a>
          <a class="quick-action" routerLink="/vacancies">
            <span class="quick-action__icon">
              <span class="icon">add_circle</span>
            </span>
            <span style="flex:1; min-width:0;">
              <span class="quick-action__title">Crear vacante</span>
              <span class="quick-action__hint">Publica un nuevo cargo</span>
            </span>
          </a>
          <a class="quick-action" routerLink="/reports">
            <span class="quick-action__icon">
              <span class="icon">timer</span>
            </span>
            <span style="flex:1; min-width:0;">
              <span class="quick-action__title">Ver SLAs</span>
              <span class="quick-action__hint">Atrasos del pipeline</span>
            </span>
          </a>
          <a class="quick-action" routerLink="/induction">
            <span class="quick-action__icon">
              <span class="icon">school</span>
            </span>
            <span style="flex:1; min-width:0;">
              <span class="quick-action__title">Editar inducción</span>
              <span class="quick-action__hint">Módulos y recursos</span>
            </span>
          </a>
        </div>
      </article>

      <div class="kpi-grid">
        <a class="kpi-card" routerLink="/vacancies">
          <span class="kpi-card__icon"><span class="icon">work</span></span>
          <span class="kpi-card__label">Vacantes activas</span>
          <span class="kpi-card__value">{{ activeVacancies() }}</span>
          <span class="kpi-card__hint">de {{ vacancies().length }} totales</span>
        </a>

        <a class="kpi-card" routerLink="/applications">
          <span class="kpi-card__icon"><span class="icon">group</span></span>
          <span class="kpi-card__label">Postulaciones totales</span>
          <span class="kpi-card__value">{{ totalApplications() }}</span>
          <span class="kpi-card__hint">{{ recent().length }} más recientes</span>
        </a>

        <div class="kpi-card kpi-card--soft">
          <span class="kpi-card__icon"><span class="icon">pending_actions</span></span>
          <span class="kpi-card__label">En proceso activo</span>
          <span class="kpi-card__value">{{ inProcess() }}</span>
          <span class="kpi-card__hint">postulaciones avanzando</span>
        </div>

        <div class="kpi-card kpi-card--soft">
          <span class="kpi-card__icon"><span class="icon icon--filled">eco</span></span>
          <span class="kpi-card__label">Onboarding completo</span>
          <span class="kpi-card__value">{{ completed() }}</span>
          <span class="kpi-card__hint">cerrados en operación</span>
        </div>
      </div>

      <div class="dashboard-grid">
        <article class="card card--accent dashboard-section">
          <div class="card-section-head">
            <h2>Últimas postulaciones</h2>
            <a routerLink="/applications" class="row" style="font-size:0.8125rem;">
              Ver todo <span class="icon icon--sm">arrow_forward</span>
            </a>
          </div>

          <table class="data-table" *ngIf="recent().length; else emptyApps">
            <thead>
              <tr>
                <th>Postulante</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let a of recent()">
                <td>
                  <div class="data-table__name">
                    <span class="avatar avatar--sm">{{ initials(a) }}</span>
                    <span>{{ a.first_name }} {{ a.last_name }}</span>
                  </div>
                </td>
                <td class="text-muted">{{ a.email }}</td>
                <td>
                  <span class="badge" [class]="'badge ' + badgeClass(a.status)">
                    {{ statusLabel(a.status) }}
                  </span>
                </td>
                <td class="text-muted">{{ a.created_at }}</td>
                <td>
                  <a [routerLink]="['/applications', a.id]" class="row">
                    Abrir <span class="icon icon--sm">open_in_new</span>
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #emptyApps>
            <p class="empty">Aún no hay postulaciones registradas.</p>
          </ng-template>
        </article>

        <aside class="card card--accent-soft dashboard-section">
          <div class="card-section-head">
            <h2>Pipeline en vivo</h2>
          </div>
          <div class="pipeline-funnel">
            <div class="pipeline-funnel__row" *ngFor="let s of funnel()">
              <span class="pipeline-funnel__label">
                <span class="icon">{{ s.icon }}</span>
                {{ s.label }}
              </span>
              <span class="pipeline-funnel__value">{{ s.count }}</span>
              <div class="pipeline-funnel__bar">
                <div class="pipeline-funnel__bar-fill" [style.width.%]="s.pct"></div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  vacancies = signal<Vacancy[]>([]);
  applications = signal<ApplicationListItem[]>([]);

  activeVacancies = computed(() =>
    this.vacancies().filter((v) => v.status === 'published').length
  );
  totalApplications = computed(() => this.applications().length);
  inProcess = computed(
    () =>
      this.applications().filter(
        (a) => !['hired', 'rejected', 'onboarding_complete'].includes(a.status)
      ).length
  );
  completed = computed(
    () => this.applications().filter((a) => a.status === 'onboarding_complete').length
  );
  recent = computed(() => this.applications().slice(0, 8));
  docsToReview = computed(
    () => this.applications().filter((a) => a.status === 'docs_review').length
  );

  funnel = computed(() => {
    const apps = this.applications();
    const total = Math.max(1, apps.length);
    return FUNNEL_STAGES.map((stage) => {
      const count = apps.filter((a) => stage.match(a.status)).length;
      return { ...stage, count, pct: Math.round((count / total) * 100) };
    });
  });

  statusLabel = statusLabel;
  badgeClass = statusBadgeClass;

  initials(a: ApplicationListItem): string {
    const f = (a.first_name?.[0] ?? '').toUpperCase();
    const l = (a.last_name?.[0] ?? '').toUpperCase();
    return (f + l) || '?';
  }

  ngOnInit(): void {
    this.api.listVacancies().subscribe({ next: (v) => this.vacancies.set(v ?? []) });
    this.api
      .listApplications()
      .subscribe({ next: (a) => this.applications.set(a ?? []) });
  }
}
