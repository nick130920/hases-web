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
          <p class="page-subtitle">Crea, publica, archiva y configura el manual y cronograma del cargo.</p>
        </div>
        <button class="btn btn--primary" type="button" (click)="creating = !creating">
          {{ creating ? 'Cancelar' : 'Nueva vacante' }}
        </button>
      </header>

      <form *ngIf="creating" class="card form-grid" (ngSubmit)="create()">
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
          <button class="btn btn--primary" type="submit">Crear</button>
        </div>
        <p class="error" *ngIf="error">{{ error }}</p>
      </form>

      <table class="data-table" *ngIf="items().length; else empty">
        <thead>
          <tr><th>Título</th><th>Estado</th><th>Slug público</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let v of items()">
            <td>{{ v.title }}</td>
            <td><span class="badge">{{ v.status }}</span></td>
            <td><code>{{ v.public_slug }}</code></td>
            <td class="data-table__actions">
              <button class="btn btn--ghost" *ngIf="v.status === 'draft'" (click)="publish(v)">
                Publicar
              </button>
              <button class="btn btn--ghost" *ngIf="v.status !== 'closed'" (click)="archive(v)">
                Archivar
              </button>
              <button class="btn btn--ghost" (click)="select(v)">
                {{ selectedId === v.id ? 'Cerrar' : 'Configurar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p class="empty">No hay vacantes. Crea la primera con el botón superior.</p>
      </ng-template>

      <article class="card" *ngIf="selectedId">
        <h2>Manual de funciones</h2>
        <p class="page-subtitle">Texto enriquecido (markdown simple) y archivo opcional.</p>
        <textarea
          rows="6"
          [(ngModel)]="manual.body"
          name="manual_body"
          placeholder="Misión del cargo, responsabilidades, KPIs…"
        ></textarea>
        <input type="file" id="man-file" hidden (change)="onManualFile($event)" />
        <div class="form-actions">
          <button class="btn btn--ghost" (click)="trigger('man-file')">
            {{ manualFile?.name || 'Adjuntar archivo (opcional)' }}
          </button>
          <button class="btn btn--primary" (click)="saveManual()">Guardar manual</button>
          <a *ngIf="manual.file_id" [href]="api.fileUrl(manual.file_id)" target="_blank">Ver archivo</a>
        </div>

        <h2>Cronograma de actividades</h2>
        <p class="page-subtitle">
          Define las actividades de fase teórica y práctica que el trabajador debe completar.
        </p>
        <table class="data-table">
          <thead>
            <tr><th>Fase</th><th>Orden</th><th>Título</th><th>Descripción</th><th>Evidencia</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let a of templateActivities()">
              <td><span class="badge">{{ a.phase }}</span></td>
              <td>{{ a.sort_order }}</td>
              <td>{{ a.title }}</td>
              <td>{{ a.description }}</td>
              <td>{{ a.evidence_required ? 'Sí' : 'No' }}</td>
              <td>
                <button class="btn btn--ghost" (click)="deleteActivity(a)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="form-grid">
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
            <button class="btn btn--primary" (click)="addActivity()">Agregar actividad</button>
          </div>
        </div>
        <p class="success" *ngIf="ok">{{ ok }}</p>
        <p class="error" *ngIf="actError">{{ actError }}</p>
      </article>
    </section>
  `,
  styles: [
    `
      textarea {
        width: 100%;
        padding: 9px 12px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-outline);
        font-family: inherit;
        background: var(--color-surface-elevated);
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
