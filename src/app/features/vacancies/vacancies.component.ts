import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Vacancy } from '../../core/types';

@Component({
  selector: 'app-vacancies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head page-head--with-action">
        <div>
          <h1>Vacantes</h1>
          <p class="page-subtitle">Crea, publica y archiva ofertas laborales.</p>
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
        <label>
          Descripción
          <textarea name="description" [(ngModel)]="form.description" rows="3"></textarea>
        </label>
        <label>
          Requisitos
          <textarea name="requirements" [(ngModel)]="form.requirements" rows="3"></textarea>
        </label>
        <div class="form-actions">
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
            <td>
              <code>{{ v.public_slug }}</code>
            </td>
            <td class="data-table__actions">
              <button class="btn btn--ghost" *ngIf="v.status === 'draft'" (click)="publish(v)">
                Publicar
              </button>
              <button class="btn btn--ghost" *ngIf="v.status !== 'closed'" (click)="archive(v)">
                Archivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <ng-template #empty>
        <p class="empty">No hay vacantes. Crea la primera con el botón superior.</p>
      </ng-template>
    </section>
  `,
})
export class VacanciesComponent implements OnInit {
  private readonly api = inject(ApiService);
  items = signal<Vacancy[]>([]);
  creating = false;
  form = { title: '', description: '', requirements: '' };
  error = '';

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
}
