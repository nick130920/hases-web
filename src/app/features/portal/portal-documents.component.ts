import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { WorkerApiService } from '../../core/worker-api.service';
import { ApplicationDetail, ApplicationDocument } from '../../core/types';
import { ToastService } from '../../core/toast.service';
import { environment } from '../../../environments/environment';

interface UploadDraft {
  file?: File;
  issuedAt?: string;
  busy?: boolean;
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
          Toca cada documento para subirlo desde tu celular o computador.
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
            {{ pendingHint() }}
          </p>
        </div>
      </div>

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

          <label
            *ngIf="d.requires_issued_at && !d.file_id"
            class="doc-card__date-label"
          >
            Fecha de emisión
            <input
              type="date"
              [(ngModel)]="drafts[d.checklist_item_id].issuedAt"
              [name]="'di-' + d.checklist_item_id"
            />
          </label>

          <input
            type="file"
            [id]="'pf-' + d.checklist_item_id"
            hidden
            (change)="onFile(a.id, d, $event)"
          />
          <button
            class="dropzone"
            type="button"
            [class.is-busy]="drafts[d.checklist_item_id].busy"
            [disabled]="drafts[d.checklist_item_id].busy"
            (click)="trigger('pf-' + d.checklist_item_id)"
          >
            <span class="dropzone__icon" aria-hidden="true">
              <span class="icon">{{ d.file_id ? 'sync' : 'cloud_upload' }}</span>
            </span>
            <span style="flex:1; min-width:0;">
              <span class="dropzone__title">
                {{
                  drafts[d.checklist_item_id].busy
                    ? 'Subiendo…'
                    : d.file_id
                      ? 'Cambiar archivo'
                      : 'Subir archivo'
                }}
              </span>
              <span class="dropzone__hint">
                {{ uploadHint(d) }}
              </span>
            </span>
          </button>
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
      .doc-card__date-label {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 0.6875rem;
        font-weight: 700;
        color: var(--color-on-surface-secondary);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .doc-card__date-label input {
        padding: 9px 12px;
        border: 1px solid var(--color-outline);
        border-radius: var(--radius-sm);
        font-family: inherit;
        font-size: 0.875rem;
        text-transform: none;
        letter-spacing: normal;
      }
    `,
  ],
})
export class PortalDocumentsComponent implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly worker = inject(WorkerApiService);
  private readonly toast = inject(ToastService);

  app = signal<ApplicationDetail | null>(null);
  drafts: Record<string, UploadDraft> = {};

  completionPct = computed(() => {
    const c = this.app()?.completeness;
    if (!c?.required_total) return 0;
    return Math.round((c.required_satisfied / c.required_total) * 100);
  });

  pendingHint = computed(() => {
    const c = this.app()?.completeness;
    if (!c) return '';
    const missing = (c.required_total ?? 0) - (c.required_satisfied ?? 0);
    if (missing <= 0) return '¡Todos los obligatorios están al día!';
    return `Te falta${missing === 1 ? '' : 'n'} ${missing} obligatorio${missing === 1 ? '' : 's'}.`;
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

  uploadHint(d: ApplicationDocument): string {
    const draft = this.drafts[d.checklist_item_id];
    if (d.requires_issued_at && !draft?.issuedAt && !d.file_id) {
      return 'Indica la fecha de emisión arriba antes de subir.';
    }
    return 'Se sube automáticamente al elegir el archivo.';
  }

  /**
   * Auto-subida desde el portal: igual que en backoffice, al elegir archivo
   * se carga inmediatamente. Si requiere fecha de emisión y no la capturó,
   * mostramos toast y dejamos el archivo listo para reintento manual.
   */
  onFile(appId: string, d: ApplicationDocument, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const draft = this.drafts[d.checklist_item_id] ?? {};
    draft.file = file;
    this.drafts[d.checklist_item_id] = draft;
    input.value = '';

    if (d.requires_issued_at && !draft.issuedAt) {
      this.toast.warning(`Indica la fecha de emisión de "${d.label}" antes de subir.`, 5000);
      return;
    }

    this.upload(appId, d);
  }

  private upload(_appId: string, d: ApplicationDocument): void {
    const draft = this.drafts[d.checklist_item_id];
    if (!draft?.file) return;
    draft.busy = true;
    this.worker.uploadDocument(d.checklist_item_id, draft.file, draft.issuedAt).subscribe({
      next: () => {
        this.drafts[d.checklist_item_id] = {};
        this.toast.success(`"${d.label}" subido correctamente`);
        this.refresh();
      },
      error: (e) => {
        draft.busy = false;
        this.toast.error(e?.error?.error ?? 'No se pudo subir');
      },
    });
  }
}
