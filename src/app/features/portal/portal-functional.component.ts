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
    <header class="page-head">
      <h1 style="font-size: 1.5rem;">Plan funcional</h1>
      <p class="page-subtitle">
        Manual de funciones del cargo y cronograma de actividades teóricas y prácticas.
      </p>
    </header>

    <p class="success" *ngIf="ok">{{ ok }}</p>
    <p class="error" *ngIf="error">{{ error }}</p>

    <article class="card card--accent" *ngIf="plan() as p">
      <div class="card-section-head">
        <h2>Manual del cargo</h2>
      </div>
      <pre class="role-manual">{{
        p.role_manual_body || p.manual_summary || 'Pendiente de carga por RR.HH.'
      }}</pre>
      <p class="row" *ngIf="p.role_manual_file_id">
        <span class="icon icon--sm">picture_as_pdf</span>
        <a [href]="api.fileUrl(p.role_manual_file_id)" target="_blank">
          Descargar manual completo
        </a>
      </p>
    </article>

    <article class="card">
      <div class="card-section-head">
        <h2>
          <span class="icon" style="color: var(--color-primary); margin-right: 6px;">menu_book</span>
          Fase teórica
        </h2>
        <span class="badge badge--soft">{{ theoryActivities().length }} actividades</span>
      </div>
      <ng-container *ngIf="theoryActivities().length; else noTheory">
        <ul class="module-list">
          <li *ngFor="let a of theoryActivities()">
            <strong>{{ a.sort_order }}. {{ a.title }}</strong>
            <p>{{ a.description }}</p>
            <p class="row" *ngIf="a.audiovisual_file_id">
              <span class="icon icon--sm">play_circle</span>
              <a [href]="api.fileUrl(a.audiovisual_file_id)" target="_blank">
                Material audiovisual
              </a>
            </p>
            <ng-container *ngIf="a.completed_at; else theoryForm">
              <span class="badge badge--success">
                <span class="icon icon--sm">check</span>
                Completado el {{ a.completed_at | slice : 0 : 10 }}
              </span>
            </ng-container>
            <ng-template #theoryForm>
              <textarea
                [(ngModel)]="notes[a.id]"
                [name]="'tn-' + a.id"
                rows="2"
                placeholder="Tus notas u observaciones"
                class="portal-textarea"
              ></textarea>
              <button class="btn btn--primary" (click)="complete(a)">
                <span class="icon icon--sm">task_alt</span>
                Marcar completada
              </button>
            </ng-template>
          </li>
        </ul>
      </ng-container>
      <ng-template #noTheory>
        <p class="empty">No hay actividades teóricas configuradas para este cargo.</p>
      </ng-template>
    </article>

    <article class="card card--accent-soft">
      <div class="card-section-head">
        <h2>
          <span class="icon" style="color: var(--color-accent-strong); margin-right: 6px;">build</span>
          Fase práctica
        </h2>
        <span class="badge badge--soft">{{ practiceActivities().length }} actividades</span>
      </div>
      <ng-container *ngIf="practiceActivities().length; else noPractice">
        <ul class="module-list">
          <li *ngFor="let a of practiceActivities()">
            <strong>{{ a.sort_order }}. {{ a.title }}</strong>
            <p>{{ a.description }}</p>
            <ng-container *ngIf="a.completed_at; else practiceForm">
              <span class="badge badge--success">
                <span class="icon icon--sm">check</span>
                Completada el {{ a.completed_at | slice : 0 : 10 }}
              </span>
            </ng-container>
            <ng-template #practiceForm>
              <textarea
                [(ngModel)]="notes[a.id]"
                [name]="'pn-' + a.id"
                rows="2"
                placeholder="Observaciones / recomendaciones"
                class="portal-textarea"
              ></textarea>
              <input
                type="file"
                multiple
                [id]="'pf-' + a.id"
                hidden
                (change)="onFiles(a.id, $event)"
              />
              <div class="row" style="gap: 8px; margin-top: 8px;">
                <button class="btn btn--ghost" (click)="trigger('pf-' + a.id)">
                  <span class="icon icon--sm">attach_file</span>
                  {{ filesLabel(a.id) }}
                </button>
                <button class="btn btn--primary" (click)="complete(a)">
                  <span class="icon icon--sm">task_alt</span>
                  Marcar completada
                </button>
              </div>
            </ng-template>
          </li>
        </ul>
      </ng-container>
      <ng-template #noPractice>
        <p class="empty">No hay actividades prácticas configuradas para este cargo.</p>
      </ng-template>
    </article>
  `,
  styles: [
    `
      .role-manual {
        white-space: pre-wrap;
        background: var(--color-surface);
        padding: 14px 16px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-outline);
        font-family: inherit;
        font-size: 0.9375rem;
        line-height: 1.55;
        color: var(--color-on-surface);
        margin: 0 0 14px;
      }
      .portal-textarea {
        width: 100%;
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-outline);
        font-family: inherit;
        font-size: 0.9375rem;
        background: var(--color-surface);
        color: var(--color-on-surface);
        margin-top: 8px;
        resize: vertical;
        min-height: 64px;
        transition: border-color var(--motion-fast) var(--easing-standard),
          box-shadow var(--motion-fast) var(--easing-standard);
      }
      .portal-textarea:focus {
        outline: none;
        border-color: var(--color-focus-ring);
        box-shadow: var(--shadow-focus);
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
