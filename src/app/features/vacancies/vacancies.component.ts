import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { FunctionalActivity, RoleManual, Vacancy } from '../../core/types';

interface ActivityDraft {
  phase: 'theory' | 'practice';
  sort_order: number;
  title: string;
  description: string;
  evidence_required: boolean;
}

@Component({
  selector: 'app-vacancies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head page-head--with-action">
        <div>
          <h1>Vacantes</h1>
          <p class="page-subtitle">
            Crea, publica, archiva y configura el manual y cronograma del cargo.
          </p>
        </div>
        <button class="btn btn--primary" type="button" (click)="creating = !creating">
          <span class="icon icon--sm">{{ creating ? 'close' : 'add' }}</span>
          {{ creating ? 'Cancelar' : 'Nueva vacante' }}
        </button>
      </header>

      <form *ngIf="creating" class="card card--accent form-grid" (ngSubmit)="create()">
        <h2 class="form-grid__full" style="margin:0;">Nueva vacante</h2>
        <label>
          Título
          <input name="title" [(ngModel)]="form.title" required />
        </label>
        <label class="form-grid__full">
          Descripción
          <textarea name="description" [(ngModel)]="form.description" rows="3"></textarea>
        </label>
        <label class="form-grid__full">
          Requisitos
          <textarea name="requirements" [(ngModel)]="form.requirements" rows="3"></textarea>
        </label>
        <div class="form-actions form-grid__full">
          <button class="btn btn--ghost" type="button" (click)="creating = false">Cancelar</button>
          <button class="btn btn--primary" type="submit">
            <span class="icon icon--sm">save</span>
            Crear vacante
          </button>
        </div>
        <p class="error form-grid__full" *ngIf="error">{{ error }}</p>
      </form>

      <div class="card" *ngIf="items().length; else empty">
        <table class="data-table">
          <thead>
            <tr>
              <th>Vacante</th>
              <th>Estado</th>
              <th>Slug público</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let v of items()">
              <td>
                <div class="data-table__name">
                  <span class="avatar avatar--sm avatar--accent">
                    <span class="icon icon--sm">work</span>
                  </span>
                  <span>
                    {{ v.title }}
                    <small *ngIf="v.published_at">Publicada {{ v.published_at | slice : 0 : 10 }}</small>
                  </span>
                </div>
              </td>
              <td>
                <span class="badge" [class]="'badge ' + vacancyBadgeClass(v.status)">
                  {{ vacancyStatusLabel(v.status) }}
                </span>
              </td>
              <td>
                <code class="text-muted">{{ v.public_slug || '—' }}</code>
              </td>
              <td class="data-table__actions" style="justify-content: flex-end;">
                <button class="btn btn--ghost" *ngIf="v.status === 'draft'" (click)="publish(v)">
                  <span class="icon icon--sm">rocket_launch</span>
                  Publicar
                </button>
                <button class="btn btn--ghost" *ngIf="v.status !== 'closed'" (click)="archive(v)">
                  <span class="icon icon--sm">archive</span>
                  Archivar
                </button>
                <button
                  class="btn"
                  [class.btn--primary]="selectedId !== v.id"
                  [class.btn--ghost]="selectedId === v.id"
                  (click)="select(v)"
                >
                  <span class="icon icon--sm">{{ selectedId === v.id ? 'expand_less' : 'tune' }}</span>
                  {{ selectedId === v.id ? 'Cerrar' : 'Configurar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty>
        <p class="empty">
          No hay vacantes registradas. Crea la primera con el botón superior.
        </p>
      </ng-template>

      <article class="card card--accent-soft" *ngIf="selectedId">
        <div class="card-section-head">
          <h2>Manual de funciones</h2>
        </div>
        <p class="page-subtitle" style="margin-bottom: 14px;">
          Texto enriquecido (markdown simple) y archivo opcional con la versión definitiva.
        </p>
        <textarea
          rows="6"
          class="vac-textarea"
          [(ngModel)]="manual.body"
          name="manual_body"
          placeholder="Misión del cargo, responsabilidades, KPIs…"
        ></textarea>
        <input type="file" id="man-file" hidden (change)="onManualFile($event)" />
        <div class="form-actions">
          <button class="btn btn--ghost" (click)="trigger('man-file')">
            <span class="icon icon--sm">attach_file</span>
            {{ manualFile?.name || 'Adjuntar archivo (opcional)' }}
          </button>
          <button class="btn btn--primary" (click)="saveManual()">
            <span class="icon icon--sm">save</span>
            Guardar manual
          </button>
          <a *ngIf="manual.file_id" [href]="api.fileUrl(manual.file_id)" target="_blank">
            Ver archivo actual
          </a>
        </div>

        <div class="card-section-head" style="margin-top: 32px;">
          <h2>Cronograma de actividades</h2>
        </div>
        <p class="page-subtitle" style="margin-bottom: 14px;">
          Define las actividades de fase teórica y práctica que el trabajador debe completar.
        </p>

        <table class="data-table" *ngIf="templateActivities().length; else noActs">
          <thead>
            <tr>
              <th>Fase</th>
              <th>Orden</th>
              <th>Título</th>
              <th>Descripción</th>
              <th>Evidencia</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of templateActivities()">
              <td>
                <span
                  class="badge"
                  [class.badge--soft]="a.phase === 'theory'"
                  [class.badge--accent]="a.phase === 'practice'"
                >
                  {{ a.phase === 'theory' ? 'Teoría' : 'Práctica' }}
                </span>
              </td>
              <td>{{ a.sort_order }}</td>
              <td><strong>{{ a.title }}</strong></td>
              <td class="text-muted">{{ a.description }}</td>
              <td>{{ a.evidence_required ? 'Requerida' : 'Opcional' }}</td>
              <td class="text-right">
                <button class="btn btn--ghost btn--danger" (click)="deleteActivity(a)">
                  <span class="icon icon--sm">delete</span>
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #noActs>
          <p class="empty">Aún no hay actividades configuradas para este cargo.</p>
        </ng-template>

        <div class="form-grid" style="margin-top: 18px;">
          <label>
            Fase
            <select [(ngModel)]="newActivity.phase" name="na_phase">
              <option value="theory">Teoría</option>
              <option value="practice">Práctica</option>
            </select>
          </label>
          <label>
            Orden
            <input type="number" [(ngModel)]="newActivity.sort_order" name="na_order" />
          </label>
          <label class="form-grid__full">
            Título
            <input [(ngModel)]="newActivity.title" name="na_title" />
          </label>
          <label class="form-grid__full">
            Descripción
            <textarea [(ngModel)]="newActivity.description" name="na_desc" rows="2"></textarea>
          </label>
          <label class="form-grid__check">
            <input type="checkbox" [(ngModel)]="newActivity.evidence_required" name="na_ev" />
            Requiere evidencia
          </label>
          <div class="form-actions">
            <button class="btn btn--primary" (click)="addActivity()">
              <span class="icon icon--sm">add</span>
              Agregar actividad
            </button>
          </div>
        </div>
        <p class="success" *ngIf="ok">{{ ok }}</p>
        <p class="error" *ngIf="actError">{{ actError }}</p>
      </article>
    </section>
  `,
  styles: [
    `
      .vac-textarea {
        width: 100%;
        padding: 12px 14px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-outline);
        font-family: inherit;
        font-size: 0.9375rem;
        background: var(--color-surface-elevated);
        color: var(--color-on-surface);
        line-height: 1.5;
        resize: vertical;
        min-height: 120px;
        transition: border-color var(--motion-fast) var(--easing-standard),
          box-shadow var(--motion-fast) var(--easing-standard);
      }
      .vac-textarea:focus {
        outline: none;
        border-color: var(--color-focus-ring);
        box-shadow: var(--shadow-focus);
      }
    `,
  ],
})
export class VacanciesComponent implements OnInit {
  protected readonly api = inject(ApiService);
  items = signal<Vacancy[]>([]);
  templateActivities = signal<FunctionalActivity[]>([]);
  creating = false;
  form = { title: '', description: '', requirements: '' };
  error = '';
  ok = '';
  actError = '';

  selectedId: string | null = null;
  manual: RoleManual = { vacancy_id: '', body: '' };
  manualFile?: File;

  newActivity: ActivityDraft = {
    phase: 'theory',
    sort_order: 1,
    title: '',
    description: '',
    evidence_required: false,
  };

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listVacancies().subscribe({ next: (v) => this.items.set(v ?? []) });
  }

  vacancyStatusLabel(s: Vacancy['status']): string {
    return s === 'draft' ? 'Borrador' : s === 'published' ? 'Publicada' : 'Cerrada';
  }

  vacancyBadgeClass(s: Vacancy['status']): string {
    return s === 'published'
      ? 'badge--status-induction'
      : s === 'closed'
        ? 'badge--neutral'
        : 'badge--status-applied';
  }

  create(): void {
    this.error = '';
    if (!this.form.title.trim()) {
      this.error = 'El título es obligatorio';
      return;
    }
    this.api.createVacancy(this.form).subscribe({
      next: () => {
        this.creating = false;
        this.form = { title: '', description: '', requirements: '' };
        this.refresh();
      },
      error: (err) => (this.error = err?.error?.error ?? 'Error al crear'),
    });
  }

  publish(v: Vacancy): void {
    this.api.publishVacancy(v.id).subscribe({ next: () => this.refresh() });
  }

  archive(v: Vacancy): void {
    if (!confirm('¿Archivar esta vacante?')) return;
    this.api.archiveVacancy(v.id).subscribe({ next: () => this.refresh() });
  }

  select(v: Vacancy): void {
    if (this.selectedId === v.id) {
      this.selectedId = null;
      return;
    }
    this.selectedId = v.id;
    this.api.getRoleManual(v.id).subscribe({ next: (m) => (this.manual = m) });
    this.api
      .listFunctionalActivityTemplates(v.id)
      .subscribe({ next: (a) => this.templateActivities.set(a ?? []) });
  }

  trigger(id: string): void {
    document.getElementById(id)?.click();
  }

  onManualFile(ev: Event): void {
    this.manualFile = (ev.target as HTMLInputElement).files?.[0];
  }

  saveManual(): void {
    if (!this.selectedId) return;
    this.api.patchRoleManual(this.selectedId, this.manual.body, this.manualFile).subscribe({
      next: () => {
        this.ok = 'Manual guardado';
        this.api.getRoleManual(this.selectedId!).subscribe({ next: (m) => (this.manual = m) });
      },
      error: (e) => (this.actError = e?.error?.error ?? 'Error al guardar'),
    });
  }

  addActivity(): void {
    if (!this.selectedId || !this.newActivity.title.trim()) {
      this.actError = 'Falta título o vacante';
      return;
    }
    this.api.createFunctionalActivityTemplate(this.selectedId, this.newActivity).subscribe({
      next: () => {
        this.ok = 'Actividad agregada';
        this.actError = '';
        if (this.selectedId) {
          this.api
            .listFunctionalActivityTemplates(this.selectedId)
            .subscribe({ next: (a) => this.templateActivities.set(a ?? []) });
        }
        this.newActivity = {
          phase: this.newActivity.phase,
          sort_order: this.newActivity.sort_order + 1,
          title: '',
          description: '',
          evidence_required: false,
        };
      },
      error: (e) => (this.actError = e?.error?.error ?? 'No se pudo agregar'),
    });
  }

  deleteActivity(a: FunctionalActivity): void {
    if (!confirm(`Eliminar actividad "${a.title}"?`)) return;
    this.api.deleteFunctionalActivityTemplate(a.id).subscribe({
      next: () =>
        this.templateActivities.update((arr) => arr.filter((x) => x.id !== a.id)),
    });
  }
}
