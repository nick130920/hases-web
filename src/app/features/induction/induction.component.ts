import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { InductionOrgModuleEnriched } from '../../core/types';

@Component({
  selector: 'app-induction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Inducción organizacional</h1>
        <p class="page-subtitle">
          Define los módulos y carga los recursos audiovisuales que el trabajador verá en el portal.
        </p>
      </header>

      <form class="card form-grid" (ngSubmit)="create()">
        <label class="form-grid__full">
          Título
          <input [(ngModel)]="form.title" name="title" required />
        </label>
        <label class="form-grid__full">
          Contenido
          <textarea [(ngModel)]="form.body" name="body" rows="4"></textarea>
        </label>
        <label>
          Orden
          <input type="number" [(ngModel)]="form.sort_order" name="sort_order" />
        </label>
        <div class="form-actions">
          <button class="btn btn--primary" type="submit">Agregar módulo</button>
        </div>
      </form>

      <article class="card" *ngFor="let m of modules()">
        <h2>{{ m.sort_order }}. {{ m.title }}</h2>
        <p>{{ m.body }}</p>
        <h3>Recursos audiovisuales</h3>
        <ul class="module-list" *ngIf="m.media?.length">
          <li *ngFor="let media of m.media">
            <strong>{{ media.title || media.kind }}</strong>
            <p class="muted">
              {{ media.kind }}
              <ng-container *ngIf="media.duration_seconds"> · {{ media.duration_seconds }} s</ng-container>
            </p>
            <a [href]="api.fileUrl(media.file_id)" target="_blank">Ver</a>
            <button class="btn btn--ghost" (click)="removeMedia(media.id)">Eliminar</button>
          </li>
        </ul>
        <p class="muted" *ngIf="!m.media?.length">Sin recursos.</p>

        <div class="form-grid">
          <label>
            Tipo
            <select [(ngModel)]="upload[m.id].kind" [name]="'k-' + m.id">
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="image">Imagen</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <label>
            Título
            <input [(ngModel)]="upload[m.id].title" [name]="'t-' + m.id" />
          </label>
          <label>
            Orden
            <input type="number" [(ngModel)]="upload[m.id].sort" [name]="'so-' + m.id" />
          </label>
          <label>
            Duración (s)
            <input type="number" [(ngModel)]="upload[m.id].duration" [name]="'d-' + m.id" />
          </label>
          <input type="file" [id]="'mf-' + m.id" hidden (change)="onMediaFile(m.id, $event)" />
          <button class="btn btn--ghost" type="button" (click)="trigger('mf-' + m.id)">
            {{ uploadName(m.id) || 'Elegir archivo' }}
          </button>
          <div class="form-actions">
            <button class="btn btn--primary" type="button" (click)="addMedia(m.id)">
              Agregar recurso
            </button>
          </div>
        </div>
      </article>
    </section>
  `,
})
export class InductionComponent implements OnInit {
  protected readonly api = inject(ApiService);
  modules = signal<InductionOrgModuleEnriched[]>([]);
  form = { title: '', body: '', sort_order: 1 };
  upload: Record<
    string,
    { kind: string; title: string; sort: number; duration?: number; file?: File }
  > = {};

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listInductionModules().subscribe({
      next: (m) => {
        const list = m ?? [];
        this.modules.set(list);
        list.forEach((mod) => {
          if (!this.upload[mod.id]) {
            this.upload[mod.id] = { kind: 'video', title: '', sort: 1 };
          }
        });
      },
    });
  }

  trigger(id: string): void {
    document.getElementById(id)?.click();
  }

  uploadName(moduleId: string): string {
    return this.upload[moduleId]?.file?.name ?? '';
  }

  create(): void {
    if (!this.form.title.trim()) return;
    this.api.createInductionModule(this.form).subscribe({
      next: () => {
        this.form = { title: '', body: '', sort_order: this.form.sort_order + 1 };
        this.refresh();
      },
    });
  }

  onMediaFile(moduleId: string, ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.upload[moduleId] = { ...this.upload[moduleId], file };
  }

  addMedia(moduleId: string): void {
    const u = this.upload[moduleId];
    if (!u?.file) return;
    this.api
      .uploadInductionMedia(moduleId, u.kind, u.title, u.file, u.sort, u.duration)
      .subscribe({
        next: () => {
          this.upload[moduleId] = { kind: u.kind, title: '', sort: (u.sort || 0) + 1 };
          this.refresh();
        },
      });
  }

  removeMedia(mediaId: string): void {
    if (!confirm('¿Eliminar recurso?')) return;
    this.api.deleteInductionMedia(mediaId).subscribe({ next: () => this.refresh() });
  }
}
