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
          Define los módulos y carga los recursos audiovisuales que el trabajador
          verá en su portal personal.
        </p>
      </header>

      <form class="card card--accent form-grid" (ngSubmit)="create()">
        <h2 class="form-grid__full" style="margin:0;">Nuevo módulo</h2>
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
          <button class="btn btn--primary" type="submit">
            <span class="icon icon--sm">add</span>
            Agregar módulo
          </button>
        </div>
      </form>

      <article class="card" *ngFor="let m of modules()">
        <div class="card-section-head">
          <h2>
            <span class="badge badge--soft">{{ m.sort_order }}</span>
            {{ m.title }}
          </h2>
          <span class="badge badge--neutral">
            {{ m.media?.length || 0 }} recurso(s)
          </span>
        </div>
        <p class="page-subtitle" style="margin-bottom: 16px; line-height: 1.6;">
          {{ m.body }}
        </p>

        <div class="card-section-head" style="margin-top: 8px;">
          <h3 style="margin: 0; font-size: 0.9rem; color: var(--color-on-surface-secondary); letter-spacing: 0.1em; text-transform: uppercase;">
            Recursos audiovisuales
          </h3>
        </div>

        <ul class="module-list" *ngIf="m.media?.length">
          <li *ngFor="let media of m.media">
            <strong>{{ media.title || media.kind }}</strong>
            <p class="muted">
              {{ mediaLabel(media.kind) }}
              <ng-container *ngIf="media.duration_seconds">
                · {{ media.duration_seconds }} s
              </ng-container>
            </p>
            <div class="row" style="margin-top: 8px;">
              <a [href]="api.fileUrl(media.file_id)" target="_blank" class="btn btn--ghost">
                <span class="icon icon--sm">open_in_new</span>
                Ver
              </a>
              <button class="btn btn--ghost btn--danger" (click)="removeMedia(media.id)">
                <span class="icon icon--sm">delete</span>
                Eliminar
              </button>
            </div>
          </li>
        </ul>
        <p class="muted" *ngIf="!m.media?.length">Aún no hay recursos cargados.</p>

        <div class="form-grid" style="margin-top: 18px;">
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
          <button
            class="btn btn--ghost form-grid__full"
            type="button"
            (click)="trigger('mf-' + m.id)"
          >
            <span class="icon icon--sm">attach_file</span>
            {{ uploadName(m.id) || 'Elegir archivo' }}
          </button>
          <div class="form-actions form-grid__full">
            <button class="btn btn--primary" type="button" (click)="addMedia(m.id)">
              <span class="icon icon--sm">cloud_upload</span>
              Agregar recurso
            </button>
          </div>
        </div>
      </article>

      <p class="empty" *ngIf="!modules().length">
        Aún no hay módulos de inducción. Crea el primero arriba.
      </p>
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

  mediaLabel(kind: string): string {
    return kind === 'video'
      ? 'Video'
      : kind === 'audio'
        ? 'Audio'
        : kind === 'image'
          ? 'Imagen'
          : kind === 'pdf'
            ? 'PDF'
            : kind;
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
