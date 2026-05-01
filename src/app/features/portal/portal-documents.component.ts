import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
    <ng-container *ngIf="app() as a; else loading">
      <header class="page-head">
        <h1 style="font-size: 1.5rem;">Mis documentos</h1>
        <p class="page-subtitle">
          Sube los documentos solicitados. RR.HH. los revisará uno a uno.
        </p>
      </header>

      <div class="progress-card" *ngIf="a.completeness as c">
        <div
          class="progress-card__ring"
          [style.--pct]="completionPct() + '%'"
        >
          <span class="progress-card__ring-text">{{ completionPct() }}%</span>
        </div>
        <div class="progress-card__body">
          <p class="progress-card__title">
            {{ c.required_satisfied || 0 }} / {{ c.required_total || 0 }} obligatorios
          </p>
          <p class="progress-card__hint">
            {{ c.with_file || 0 }} archivos cargados, {{ c.approved || 0 }} aprobados.
          </p>
        </div>
      </div>

      <p class="success" *ngIf="ok">{{ ok }}</p>
      <p class="error" *ngIf="error">{{ error }}</p>

      <div class="doc-cards">
        <article
          class="doc-card"
          *ngFor="let d of a.documents"
          [class.doc-card--approved]="d.review_status === 'approved'"
          [class.doc-card--rejected]="d.review_status === 'rejected'"
        >
          <header class="doc-card__head">
            <div>
              <strong>{{ d.label }}</strong>
              <div class="row" style="gap: 6px; margin-top: 4px;">
                <span class="badge badge--neutral" *ngIf="d.required">Obligatorio</span>
                <span class="badge badge--soft" *ngIf="d.requires_template">Plantilla</span>
              </div>
            </div>
            <span class="badge" [class]="'badge ' + statusBadge(d.review_status)">
              {{ statusLabel(d.review_status) }}
            </span>
          </header>

          <p class="muted" *ngIf="d.max_age_days">
            Máximo {{ d.max_age_days }} días de antigüedad.
          </p>
          <p class="row" *ngIf="d.requires_template" style="gap: 6px;">
            <span class="icon icon--sm">download</span>
            <a [href]="templateUrl(d.item_key)" target="_blank">
              Descargar plantilla oficial
            </a>
          </p>
          <p class="error" *ngIf="d.review_status === 'rejected' && d.reviewer_notes">
            <strong>Motivo:</strong> {{ d.reviewer_notes }}
          </p>
          <p class="row" *ngIf="d.file_id" style="gap: 6px;">
            <span class="icon icon--sm">attachment</span>
            <a [href]="api.fileUrl(d.file_id)" target="_blank">Ver archivo cargado</a>
          </p>

          <div class="doc-card__actions">
            <input
              type="file"
              [id]="'pf-' + d.checklist_item_id"
              hidden
              (change)="onFile(d, $event)"
            />
            <button class="btn btn--ghost" (click)="trigger('pf-' + d.checklist_item_id)">
              <span class="icon icon--sm">attach_file</span>
              {{ fileNameFor(d.checklist_item_id) || 'Elegir archivo' }}
            </button>
            <input
              *ngIf="d.requires_issued_at"
              type="date"
              [(ngModel)]="drafts[d.checklist_item_id].issuedAt"
              [name]="'di-' + d.checklist_item_id"
              class="doc-card__date"
            />
            <button
              class="btn btn--primary"
              [disabled]="!fileFor(d.checklist_item_id)"
              (click)="submit(d)"
            >
              <span class="icon icon--sm">cloud_upload</span>
              Subir
            </button>
          </div>
        </article>
      </div>
    </ng-container>
    <ng-template #loading><p class="worker-greeting">Cargando…</p></ng-template>
  `,
  styles: [
    `
      .doc-cards {
        display: grid;
        gap: 14px;
      }
      .doc-card {
        background: var(--color-surface-elevated);
        border: 1px solid var(--color-outline);
        border-left: 4px solid var(--color-outline-strong);
        border-radius: var(--radius-md);
        padding: 16px 18px;
        box-shadow: var(--shadow-soft);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .doc-card--approved {
        border-left-color: var(--color-accent);
      }
      .doc-card--rejected {
        border-left-color: var(--color-error);
      }
      .doc-card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .doc-card__head strong {
        font-size: 0.9375rem;
        color: var(--color-on-surface-strong);
      }
      .doc-card__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }
      .doc-card__date {
        padding: 9px 12px;
        border: 1px solid var(--color-outline);
        border-radius: var(--radius-sm);
        font-family: inherit;
        font-size: 0.875rem;
      }
    `,
  ],
})
export class PortalDocumentsComponent implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly worker = inject(WorkerApiService);

  app = signal<ApplicationDetail | null>(null);
  drafts: Record<string, UploadDraft> = {};
  ok = '';
  error = '';

  completionPct = computed(() => {
    const c = this.app()?.completeness;
    if (!c?.required_total) return 0;
    return Math.round((c.required_satisfied / c.required_total) * 100);
  });

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

  statusBadge(status: string): string {
    return status === 'approved'
      ? 'badge--success'
      : status === 'rejected'
        ? 'badge--error'
        : 'badge--neutral';
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
