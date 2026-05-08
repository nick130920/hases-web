import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WorkerApiService } from '../../core/worker-api.service';
import { ApplicationDetail, statusLabel } from '../../core/types';
import { WorkerSection, workerNextAction } from '../../core/next-action';

@Component({
  selector: 'app-portal-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ng-container *ngIf="app() as a; else loading">
      <p class="worker-greeting">Hola, {{ a.first_name }}</p>
      <p class="worker-status">
        Tu proceso está en
        <strong>{{ statusLabel(a.status) }}</strong>
      </p>

      <article class="next-action">
        <div class="next-action__icon" aria-hidden="true">
          <span class="icon">{{ next().icon }}</span>
        </div>
        <div class="next-action__body">
          <span class="next-action__eyebrow">Tu próximo paso</span>
          <h2 class="next-action__title">{{ next().title }}</h2>
          <p class="next-action__hint">{{ next().hint }}</p>
        </div>
        <button
          type="button"
          class="btn btn--primary next-action__cta"
          (click)="goToSection(next().section)"
        >
          {{ next().cta }}
          <span class="icon icon--sm">arrow_forward</span>
        </button>
      </article>

      <div class="progress-card">
        <div
          class="progress-card__ring"
          [style.--pct]="overallPct() + '%'"
        >
          <span class="progress-card__ring-text">{{ overallPct() }}%</span>
        </div>
        <div class="progress-card__body">
          <p class="progress-card__title">Avance global</p>
          <p class="progress-card__hint">{{ overallHint() }}</p>
        </div>
      </div>

      <div class="portal-kpi-list">
        <a class="portal-kpi" routerLink="/portal/documentos">
          <span class="portal-kpi__icon">
            <span class="icon">folder_shared</span>
          </span>
          <span style="flex:1; min-width:0;">
            <span class="portal-kpi__title">Documentos</span>
            <span class="portal-kpi__hint">
              {{ docCompletion(a) }} obligatorios subidos
            </span>
          </span>
          <span class="portal-kpi__chevron">
            <span class="icon">chevron_right</span>
          </span>
        </a>

        <a class="portal-kpi" routerLink="/portal/induccion">
          <span class="portal-kpi__icon">
            <span class="icon">school</span>
          </span>
          <span style="flex:1; min-width:0;">
            <span class="portal-kpi__title">Inducción</span>
            <span class="portal-kpi__hint">{{ inductionLabel(a.status) }}</span>
          </span>
          <span class="portal-kpi__chevron">
            <span class="icon">chevron_right</span>
          </span>
        </a>

        <a class="portal-kpi" routerLink="/portal/funcional">
          <span class="portal-kpi__icon">
            <span class="icon">engineering</span>
          </span>
          <span style="flex:1; min-width:0;">
            <span class="portal-kpi__title">Plan funcional</span>
            <span class="portal-kpi__hint">{{ functionalLabel(a.status) }}</span>
          </span>
          <span class="portal-kpi__chevron">
            <span class="icon">chevron_right</span>
          </span>
        </a>
      </div>
    </ng-container>
    <ng-template #loading>
      <p class="worker-greeting">Cargando…</p>
    </ng-template>
  `,
})
export class PortalHomeComponent implements OnInit {
  private readonly api = inject(WorkerApiService);
  private readonly router = inject(Router);
  app = signal<ApplicationDetail | null>(null);
  statusLabel = statusLabel;

  next = computed(() => {
    const a = this.app();
    if (!a) {
      return workerNextAction('', 0);
    }
    const c = a.completeness;
    const docsPending = c
      ? Math.max(0, (c.required_total ?? 0) - (c.required_satisfied ?? 0))
      : 0;
    return workerNextAction(a.status, docsPending);
  });

  /**
   * Estima un avance global ponderando documentos, inducción y plan funcional.
   * Es solo indicativo para el ring del portal — la fuente de verdad sigue
   * siendo el estado del pipeline.
   */
  overallPct = computed(() => {
    const a = this.app();
    if (!a) return 0;
    const docs = a.completeness?.required_total
      ? (a.completeness.required_satisfied / a.completeness.required_total) * 40
      : 0;
    const induction = this.inductionScore(a.status) * 30;
    const functional = this.functionalScore(a.status) * 30;
    return Math.min(100, Math.round(docs + induction + functional));
  });

  overallHint = computed(() => {
    const pct = this.overallPct();
    if (pct === 100) return '¡Felicidades! Onboarding completo.';
    if (pct >= 70) return 'Estás muy cerca, finaliza los últimos pasos.';
    if (pct >= 40) return 'Vas por buen camino, sigue avanzando.';
    return 'Comienza por subir tus documentos.';
  });

  ngOnInit(): void {
    this.api.getApplication().subscribe({ next: (a) => this.app.set(a) });
  }

  goToSection(section: WorkerSection): void {
    const target =
      section === 'documentos'
        ? '/portal/documentos'
        : section === 'induccion'
          ? '/portal/induccion'
          : section === 'funcional'
            ? '/portal/funcional'
            : '/portal/inicio';
    this.router.navigateByUrl(target);
  }

  docCompletion(a: ApplicationDetail): string {
    const c = a.completeness;
    if (!c) return '0/0';
    return `${c.required_satisfied ?? 0}/${c.required_total ?? 0}`;
  }

  inductionLabel(status: string): string {
    if (status === 'induction_org') return 'En curso';
    if (
      status === 'induction_org_done' ||
      status.startsWith('induction_') ||
      status === 'onboarding_complete'
    )
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

  private inductionScore(status: string): number {
    if (status === 'onboarding_complete') return 1;
    if (status === 'induction_org_done' || status.startsWith('induction_')) return 1;
    if (status === 'induction_org') return 0.5;
    return 0;
  }

  private functionalScore(status: string): number {
    if (status === 'onboarding_complete') return 1;
    if (status === 'induction_practice') return 0.75;
    if (status === 'induction_epp_pending') return 0.5;
    if (status === 'induction_theory') return 0.25;
    return 0;
  }
}
