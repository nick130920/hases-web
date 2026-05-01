import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { WorkerApiService } from '../../core/worker-api.service';
import { ApplicationDetail, ApplicationDocument } from '../../core/types';
import { environment } from '../../../environments/environment';

interface UploadDraft {
  file?: File;
  issuedAt?: string;
}

@Component({
  selector: 'app-portal-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page" *ngIf="app() as a; else loading">
      <header class="page-head">
        <h1>Mis documentos</h1>
        <p class="page-subtitle">
          Sube los documentos solicitados. RR.HH. los revisará uno a uno.
        </p>
      </header>

      <p class="success" *ngIf="ok">{{ ok }}</p>
      <p class="error" *ngIf="error">{{ error }}</p>

      <table class="data-table data-table--docs">
        <thead>
          <tr>
            <th>Documento</th>
            <th>Estado</th>
            <th>Subido</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let d of a.documents">
            <td>
              <strong>{{ d.label }}</strong>
              <span class="badge badge--soft" *ngIf="d.required">Obligatorio</span>
              <p class="muted" *ngIf="d.max_age_days">
                Máximo {{ d.max_age_days }} días de antigüedad
              </p>
              <p *ngIf="d.requires_template">
                <a [href]="templateUrl(d.item_key)" target="_blank">Descargar plantilla oficial</a>
              </p>
              <p class="error" *ngIf="d.review_status === 'rejected' && d.reviewer_notes">
                Motivo del rechazo: {{ d.reviewer_notes }}
              </p>
            </td>
            <td><span class="badge">{{ statusLabel(d.review_status) }}</span></td>
            <td>
              <a *ngIf="d.file_id" [href]="api.fileUrl(d.file_id)" target="_blank">Ver</a>
              <span *ngIf="!d.file_id" class="muted">—</span>
            </td>
            <td class="data-table__actions">
              <input
                type="file"
                [id]="'pf-' + d.checklist_item_id"
                hidden
                (change)="onFile(d, $event)"
              />
              <button class="btn btn--ghost" (click)="trigger('pf-' + d.checklist_item_id)">
                Elegir archivo
              </button>
              <input
                *ngIf="d.requires_issued_at"
                type="date"
                [(ngModel)]="drafts[d.checklist_item_id].issuedAt"
                [name]="'di-' + d.checklist_item_id"
              />
              <button
                class="btn btn--primary"
                [disabled]="!fileFor(d.checklist_item_id)"
                (click)="submit(d)"
              >
                {{ fileNameFor(d.checklist_item_id) || 'Subir' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <ng-template #loading><p class="page">Cargando…</p></ng-template>
  `,
})
export class PortalDocumentsComponent implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly worker = inject(WorkerApiService);

  app = signal<ApplicationDetail | null>(null);
  drafts: Record<string, UploadDraft> = {};
  ok = '';
  error = '';

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.worker.getApplication().subscribe({
      next: (a) => {
        this.app.set(a);
        a.documents.forEach((d) => {
          if (!this.drafts[d.checklist_item_id]) this.drafts[d.checklist_item_id] = {};
        });
      },
    });
  }

  templateUrl(itemKey: string): string {
    return `${environment.apiUrl}/public/document-templates/${itemKey}`;
  }

  fileFor(itemId: string): File | undefined {
    return this.drafts[itemId]?.file;
  }
  fileNameFor(itemId: string): string {
    return this.drafts[itemId]?.file?.name ?? '';
  }

  trigger(id: string): void {
    document.getElementById(id)?.click();
  }

  statusLabel(status: string): string {
    return { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' }[status] ?? status;
  }

  onFile(d: ApplicationDocument, ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.drafts[d.checklist_item_id] = { ...this.drafts[d.checklist_item_id], file };
  }

  submit(d: ApplicationDocument): void {
    const draft = this.drafts[d.checklist_item_id];
    if (!draft?.file) return;
    if (d.requires_issued_at && !draft.issuedAt) {
      this.error = `Debes indicar la fecha de emisión de "${d.label}".`;
      return;
    }
    this.error = '';
    this.ok = '';
    this.worker.uploadDocument(d.checklist_item_id, draft.file, draft.issuedAt).subscribe({
      next: () => {
        this.ok = `"${d.label}" subido correctamente`;
        this.drafts[d.checklist_item_id] = {};
        this.refresh();
      },
      error: (e) => {
        this.error = e?.error?.error ?? 'No se pudo subir';
      },
    });
  }
}
