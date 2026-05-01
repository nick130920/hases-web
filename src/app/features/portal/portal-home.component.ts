import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkerApiService } from '../../core/worker-api.service';
import { ApplicationDetail, statusLabel } from '../../core/types';

@Component({
  selector: 'app-portal-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page" *ngIf="app() as a; else loading">
      <header class="page-head">
        <h1>Hola, {{ a.first_name }}</h1>
        <p class="page-subtitle">Estado actual: <strong>{{ statusLabel(a.status) }}</strong></p>
      </header>

      <div class="kpi-grid">
        <a class="kpi-card" routerLink="/portal/documentos">
          <span class="kpi-card__value">{{ docCompletion(a) }}</span>
          <span class="kpi-card__label">Documentos aprobados</span>
        </a>
        <a class="kpi-card" routerLink="/portal/induccion">
          <span class="kpi-card__value">{{ inductionLabel(a.status) }}</span>
          <span class="kpi-card__label">Inducción organizacional</span>
        </a>
        <a class="kpi-card" routerLink="/portal/funcional">
          <span class="kpi-card__value">{{ functionalLabel(a.status) }}</span>
          <span class="kpi-card__label">Plan funcional</span>
        </a>
      </div>

      <article class="card">
        <h2>Próximos pasos</h2>
        <ol class="module-list">
          <li>
            <strong>1. Subir tu documentación</strong>
            <p>
              Sube los 12 documentos requeridos. Los certificados con fecha (ej. bancario)
              deben estar vigentes.
            </p>
          </li>
          <li>
            <strong>2. Inducción organizacional</strong>
            <p>
              Revisa los módulos audiovisuales y firma reglamento, políticas y contrato.
            </p>
          </li>
          <li>
            <strong>3. Plan funcional</strong>
            <p>
              Completa la fase teórica y carga evidencias de tu fase práctica.
            </p>
          </li>
        </ol>
      </article>
    </section>
    <ng-template #loading><p class="page">Cargando…</p></ng-template>
  `,
})
export class PortalHomeComponent implements OnInit {
  private readonly api = inject(WorkerApiService);
  app = signal<ApplicationDetail | null>(null);
  statusLabel = statusLabel;

  ngOnInit(): void {
    this.api.getApplication().subscribe({ next: (a) => this.app.set(a) });
  }

  docCompletion(a: ApplicationDetail): string {
    const c = a.completeness;
    if (!c) return '0/0';
    return `${c.required_satisfied ?? 0}/${c.required_total ?? 0}`;
  }

  inductionLabel(status: string): string {
    if (status === 'induction_org') return 'En curso';
    if (status === 'induction_org_done' || status.startsWith('induction_') || status === 'onboarding_complete')
      return 'Cerrada';
    return 'Pendiente';
  }
  functionalLabel(status: string): string {
    if (status === 'onboarding_complete') return 'Completo';
    if (
      status === 'induction_theory' ||
      status === 'induction_epp_pending' ||
      status === 'induction_practice'
    )
      return 'En curso';
    return 'Pendiente';
  }
}
