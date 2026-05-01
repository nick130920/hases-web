import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkerApiService, WorkerFunctionalPlan } from '../../core/worker-api.service';
import { FunctionalActivity } from '../../core/types';

@Component({
  selector: 'app-portal-functional',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Plan funcional</h1>
        <p class="page-subtitle">Manual de funciones y cronograma de actividades.</p>
      </header>

      <p class="success" *ngIf="ok">{{ ok }}</p>
      <p class="error" *ngIf="error">{{ error }}</p>

      <article class="card" *ngIf="plan() as p">
        <h2>Manual de funciones del cargo</h2>
        <pre class="role-manual">{{ p.role_manual_body || p.manual_summary || 'Pendiente de carga por RR.HH.' }}</pre>
        <p *ngIf="p.role_manual_file_id">
          <a [href]="api.fileUrl(p.role_manual_file_id)" target="_blank">Descargar manual completo</a>
        </p>
      </article>

      <article class="card">
        <h2>Cronograma — Fase teórica</h2>
        <ng-container *ngIf="theoryActivities().length; else noTheory">
          <div class="module-list">
            <div *ngFor="let a of theoryActivities()" class="module-list__item">
              <strong>{{ a.sort_order }}. {{ a.title }}</strong>
              <p>{{ a.description }}</p>
              <p *ngIf="a.audiovisual_file_id">
                <a [href]="api.fileUrl(a.audiovisual_file_id)" target="_blank">
                  Material audiovisual
                </a>
              </p>
              <ng-container *ngIf="a.completed_at; else theoryForm">
                <span class="badge">Completado el {{ a.completed_at }}</span>
              </ng-container>
              <ng-template #theoryForm>
                <textarea
                  [(ngModel)]="notes[a.id]"
                  [name]="'tn-' + a.id"
                  rows="2"
                  placeholder="Tus notas u observaciones"
                ></textarea>
                <button class="btn btn--primary" (click)="complete(a)">
                  Marcar completada
                </button>
              </ng-template>
            </div>
          </div>
        </ng-container>
        <ng-template #noTheory>
          <p class="empty">No hay actividades teóricas configuradas para este cargo.</p>
        </ng-template>
      </article>

      <article class="card">
        <h2>Cronograma — Fase práctica</h2>
        <ng-container *ngIf="practiceActivities().length; else noPractice">
          <div class="module-list">
            <div *ngFor="let a of practiceActivities()" class="module-list__item">
              <strong>{{ a.sort_order }}. {{ a.title }}</strong>
              <p>{{ a.description }}</p>
              <ng-container *ngIf="a.completed_at; else practiceForm">
                <span class="badge">Completada el {{ a.completed_at }}</span>
              </ng-container>
              <ng-template #practiceForm>
                <textarea
                  [(ngModel)]="notes[a.id]"
                  [name]="'pn-' + a.id"
                  rows="2"
                  placeholder="Observaciones / recomendaciones"
                ></textarea>
                <input
                  type="file"
                  multiple
                  [id]="'pf-' + a.id"
                  hidden
                  (change)="onFiles(a.id, $event)"
                />
                <button class="btn btn--ghost" (click)="trigger('pf-' + a.id)">
                  {{ filesLabel(a.id) }}
                </button>
                <button class="btn btn--primary" (click)="complete(a)">
                  Marcar completada
                </button>
              </ng-template>
            </div>
          </div>
        </ng-container>
        <ng-template #noPractice>
          <p class="empty">No hay actividades prácticas configuradas para este cargo.</p>
        </ng-template>
      </article>
    </section>
  `,
  styles: [
    `
      .role-manual {
        white-space: pre-wrap;
        background: var(--color-surface);
        padding: 14px;
        border-radius: var(--radius-sm);
      }
      .module-list__item {
        background: var(--color-surface-elevated);
        padding: 14px;
        border-left: 4px solid var(--color-accent);
        border-radius: var(--radius-sm);
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .module-list__item textarea {
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-outline);
        font-family: inherit;
      }
    `,
  ],
})
export class PortalFunctionalComponent implements OnInit {
  protected readonly api = inject(WorkerApiService);
  plan = signal<WorkerFunctionalPlan | null>(null);
  activities = signal<FunctionalActivity[]>([]);
  notes: Record<string, string> = {};
  files: Record<string, File[]> = {};
  ok = '';
  error = '';

  theoryActivities = () => this.activities().filter((a) => a.phase === 'theory');
  practiceActivities = () => this.activities().filter((a) => a.phase === 'practice');

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.getFunctionalPlan().subscribe({ next: (p) => this.plan.set(p) });
    this.api.listFunctionalActivities().subscribe({ next: (a) => this.activities.set(a ?? []) });
  }

  trigger(id: string): void {
    document.getElementById(id)?.click();
  }

  onFiles(id: string, ev: Event): void {
    const list = (ev.target as HTMLInputElement).files;
    this.files[id] = list ? Array.from(list) : [];
  }

  filesLabel(id: string): string {
    const n = this.files[id]?.length ?? 0;
    return n > 0 ? `${n} archivo(s)` : 'Adjuntar evidencia';
  }

  complete(a: FunctionalActivity): void {
    this.api.completeFunctionalActivity(a.id, this.notes[a.id] ?? '', this.files[a.id]).subscribe({
      next: () => {
        this.ok = `Actividad "${a.title}" registrada`;
        this.notes[a.id] = '';
        this.files[a.id] = [];
        this.refresh();
      },
      error: (e) => {
        this.error = e?.error?.error ?? 'No se pudo registrar la actividad';
      },
    });
  }
}
