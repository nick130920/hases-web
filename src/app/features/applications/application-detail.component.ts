import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import {
  ApplicationDetail,
  ApplicationDocument,
  EndowmentDelivery,
  FunctionalActivity,
  InductionOrgModuleEnriched,
  InterviewSession,
  PIPELINE_STATUSES,
  RejectionReason,
  statusLabel,
} from '../../core/types';
import { AuthService } from '../../core/auth.service';
import { SignaturePadComponent } from '../../shared/signature-pad.component';

type Tab =
  | 'data'
  | 'documents'
  | 'interviews'
  | 'occupational'
  | 'hiring'
  | 'induction'
  | 'functional';

interface UploadDraft {
  file?: File;
  issuedAt?: string;
}

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignaturePadComponent],
  template: `
    <section class="page" *ngIf="app() as a; else loading">
      <a routerLink="/applications" class="back-link">← Postulaciones</a>
      <header class="page-head detail-head">
        <div>
          <h1>{{ a.first_name }} {{ a.last_name }}</h1>
          <p class="page-subtitle">{{ a.email }} · {{ a.phone || '—' }}</p>
        </div>
        <div class="detail-head__status">
          <span class="badge badge--lg">{{ statusLabel(a.status) }}</span>
          <small *ngIf="a.completeness as c">
            Documentos {{ c.required_satisfied }}/{{ c.required_total }} obligatorios
          </small>
        </div>
      </header>

      <div class="tabs">
        <button *ngFor="let t of tabs" [class.is-active]="active === t.id" (click)="active = t.id">
          {{ t.label }}
        </button>
      </div>

      <!-- Datos -->
      <section *ngIf="active === 'data'" class="card form-grid">
        <label>Nombre<input [(ngModel)]="edit.first_name" name="first_name" /></label>
        <label>Apellido<input [(ngModel)]="edit.last_name" name="last_name" /></label>
        <label>Email<input [(ngModel)]="edit.email" name="email" type="email" /></label>
        <label>Teléfono<input [(ngModel)]="edit.phone" name="phone" /></label>
        <label>Canal<input [(ngModel)]="edit.channel" name="channel" /></label>
        <label>Referencia CV<input [(ngModel)]="edit.cv_reference" name="cv_reference" /></label>
        <label class="form-grid__check">
          <input type="checkbox" [(ngModel)]="edit.requires_vehicle" name="requires_vehicle" />
          Requiere documentos de vehículo
        </label>
        <label class="form-grid__full">
          Notas internas
          <textarea [(ngModel)]="edit.notes" name="notes" rows="4"></textarea>
        </label>
        <div class="form-actions form-grid__full">
          <button class="btn btn--primary" (click)="saveData()">Guardar cambios</button>
          <button class="btn btn--ghost" (click)="invite(a.id)">
            {{ invitationToken ? 'Reenviar invitación' : 'Invitar al portal' }}
          </button>
        </div>
        <p class="success form-grid__full" *ngIf="invitationToken">
          Código generado: <code>{{ invitationToken }}</code>
        </p>

        <fieldset class="transition-block form-grid__full">
          <legend>Cambiar estado</legend>
          <select [(ngModel)]="transitionStatus" name="ts">
            <option *ngFor="let s of statuses" [value]="s.value">{{ s.label }}</option>
          </select>
          <select *ngIf="transitionStatus === 'rejected'" [(ngModel)]="transitionReason" name="tr">
            <option value="">Motivo…</option>
            <option *ngFor="let r of reasons()" [value]="r.label">{{ r.label }}</option>
          </select>
          <button class="btn btn--primary" (click)="doTransition()">Aplicar</button>
        </fieldset>
      </section>

      <!-- Documentos -->
      <section *ngIf="active === 'documents'" class="card">
        <table class="data-table data-table--docs">
          <thead>
            <tr><th>Documento</th><th>Estado</th><th>Archivo</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of a.documents">
              <td>
                {{ d.label }}
                <span class="badge badge--soft" *ngIf="d.required">Obligatorio</span>
                <p class="muted" *ngIf="d.max_age_days">
                  Máx. {{ d.max_age_days }} días de antigüedad
                </p>
                <p class="muted" *ngIf="d.issued_at">Emitido: {{ d.issued_at }}</p>
              </td>
              <td><span class="badge">{{ d.review_status }}</span></td>
              <td>
                <a *ngIf="d.file_id" [href]="api.fileUrl(d.file_id)" target="_blank">Descargar</a>
                <span *ngIf="!d.file_id" class="muted">Sin archivo</span>
              </td>
              <td class="data-table__actions">
                <input
                  type="file"
                  [id]="'file-' + d.checklist_item_id"
                  hidden
                  (change)="onDocFile(d, $event)"
                />
                <button class="btn btn--ghost" (click)="trigger('file-' + d.checklist_item_id)">
                  Elegir
                </button>
                <input
                  *ngIf="d.requires_issued_at"
                  type="date"
                  [(ngModel)]="docDrafts[d.checklist_item_id].issuedAt"
                  [name]="'di-' + d.checklist_item_id"
                />
                <button
                  class="btn btn--primary"
                  [disabled]="!hasDraftFile(d.checklist_item_id)"
                  (click)="uploadDoc(a.id, d)"
                >
                  Subir
                </button>
                <button class="btn btn--ghost" *ngIf="d.file_id" (click)="review(a.id, d.id, 'approved')">
                  Aprobar
                </button>
                <button class="btn btn--ghost" *ngIf="d.file_id" (click)="review(a.id, d.id, 'rejected')">
                  Rechazar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Entrevistas -->
      <section *ngIf="active === 'interviews'" class="card">
        <div class="card-section-head">
          <h2>Sesiones de entrevista</h2>
          <div class="card-section-head__actions">
            <input [(ngModel)]="newSession.template_id" placeholder="UUID plantilla" />
            <button class="btn btn--primary" (click)="createSession(a.id)">Crear sesión</button>
          </div>
        </div>
        <table class="data-table" *ngIf="sessions().length; else noSessions">
          <thead>
            <tr><th>Programada</th><th>Modalidad</th><th>Lugar</th><th>Notas</th><th></th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of sessions()">
              <td>
                <input
                  type="datetime-local"
                  [ngModel]="toLocal(s.scheduled_at)"
                  (ngModelChange)="updateSession(s, 'scheduled_at', $event)"
                  [name]="'sa-' + s.id"
                />
              </td>
              <td>
                <input
                  [ngModel]="s.modality"
                  (ngModelChange)="updateSession(s, 'modality', $event)"
                  [name]="'mo-' + s.id"
                />
              </td>
              <td>
                <input
                  [ngModel]="s.location"
                  (ngModelChange)="updateSession(s, 'location', $event)"
                  [name]="'lo-' + s.id"
                />
              </td>
              <td>
                <input
                  [ngModel]="s.interviewer_notes"
                  (ngModelChange)="updateSession(s, 'interviewer_notes', $event)"
                  [name]="'no-' + s.id"
                />
              </td>
              <td>
                <button class="btn btn--ghost" (click)="saveSession(s)">Guardar</button>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #noSessions><p class="empty">Sin sesiones registradas.</p></ng-template>
      </section>

      <!-- Ocupacional / IPS -->
      <section *ngIf="active === 'occupational'" class="card form-grid">
        <p>
          <a [href]="api.occupationalPdfUrl(a.id)" target="_blank">Descargar PDF prellenado</a>.
          Al "Enviar a IPS" se anexa este PDF al correo automáticamente.
        </p>
        <label>Email IPS<input [(ngModel)]="occ.email_to" name="occ_email" type="email" /></label>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="recordSend(a.id)">Enviar a IPS</button>
        </div>
        <hr class="hr" />
        <h3 class="form-grid__full">Resultado IPS</h3>
        <label>
          Resultado
          <select [(ngModel)]="ips.outcome" name="ips_outcome">
            <option value="fit">Apto</option>
            <option value="fit_restrictions">Apto con restricciones</option>
            <option value="unfit">No apto</option>
          </select>
        </label>
        <label class="form-grid__full">
          Recomendaciones
          <textarea [(ngModel)]="ips.recommendations" name="ips_rec" rows="3"></textarea>
        </label>
        <input type="file" id="ips-file" hidden (change)="onIPSFile($event)" />
        <button class="btn btn--ghost" (click)="trigger('ips-file')">
          {{ ips.file?.name || 'Adjuntar PDF de la IPS' }}
        </button>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="recordIPS(a.id)">Guardar resultado</button>
        </div>
      </section>

      <!-- Decisión de empleador -->
      <section *ngIf="active === 'hiring'" class="card form-grid">
        <h2 class="form-grid__full">Decisión final</h2>
        <p class="page-subtitle form-grid__full">
          Disponible para roles <code>admin</code> y <code>hiring_manager</code>.
        </p>
        <label class="form-grid__full">
          Notas
          <textarea [(ngModel)]="hiring.notes" name="hire_notes" rows="3"></textarea>
        </label>
        <label>
          Motivo (si rechaza)
          <select [(ngModel)]="hiring.reason_id" name="hire_reason">
            <option [ngValue]="undefined">—</option>
            <option *ngFor="let r of reasons()" [ngValue]="r.id">{{ r.label }}</option>
          </select>
        </label>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="decide(a.id, 'hire')" [disabled]="hireDisabled()">
            Contratar
          </button>
          <button class="btn btn--ghost" (click)="decide(a.id, 'reject')" [disabled]="hireDisabled()">
            Rechazar
          </button>
        </div>
        <p class="muted form-grid__full" *ngIf="hireDisabled()">
          Tu rol no permite tomar la decisión final.
        </p>
        <p class="success form-grid__full" *ngIf="hiringMessage">{{ hiringMessage }}</p>
      </section>

      <!-- Inducción -->
      <section *ngIf="active === 'induction'" class="card">
        <h2>Módulos organizacionales</h2>
        <ul class="module-list">
          <li *ngFor="let m of modules()">
            <strong>{{ m.title }}</strong>
            <p>{{ m.body }}</p>
            <p class="muted" *ngIf="m.media?.length">
              {{ m.media!.length }} recurso(s) audiovisual(es) · auto-tracking en el portal
            </p>
            <button class="btn btn--ghost" (click)="markProgress(a.id, m.id)">Marcar visto</button>
          </li>
        </ul>

        <h3>Firmas (reglamento, políticas, contrato)</h3>
        <p class="page-subtitle">
          El trabajador puede firmar desde el portal con canvas. Aquí RR.HH. puede subir un archivo escaneado.
        </p>
        <div class="signature-grid">
          <div *ngFor="let kind of ['regulation','policies','contract']">
            <p class="signature-grid__label">{{ kind }}</p>
            <input type="file" [id]="'sig-' + kind" hidden (change)="uploadSignature(a.id, kind, $event)" />
            <button class="btn btn--ghost" (click)="trigger('sig-' + kind)">Subir firma</button>
          </div>
        </div>

        <details class="signature-pad-wrap">
          <summary>Firmar acá (canvas)</summary>
          <p class="page-subtitle">Selecciona kind y firma.</p>
          <select [(ngModel)]="canvasKind" name="canvas_kind">
            <option value="regulation">Reglamento</option>
            <option value="policies">Políticas</option>
            <option value="contract">Contrato</option>
          </select>
          <app-signature-pad (signed)="signCanvas(a.id, $event)" />
        </details>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="completeOrg(a.id)">
            Cerrar inducción organizacional
          </button>
        </div>
      </section>

      <!-- Plan funcional / Dotación / EPP / Cronograma -->
      <section *ngIf="active === 'functional'" class="card form-grid">
        <h2>Plan funcional</h2>
        <label class="form-grid__full">
          Resumen del manual
          <textarea [(ngModel)]="plan.manual_summary" name="plan_summary" rows="4"></textarea>
        </label>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="savePlan(a.id)">Guardar</button>
          <button class="btn btn--ghost" (click)="closeTheory(a.id)">Marcar teoría completa</button>
        </div>

        <h3 class="form-grid__full">Cronograma</h3>
        <p class="page-subtitle form-grid__full" *ngIf="!activities().length">
          No hay actividades configuradas. Define el cronograma desde la vista de la vacante.
        </p>
        <div class="form-grid__full" *ngIf="activities().length">
          <h4>Teoría</h4>
          <ul class="module-list">
            <li *ngFor="let act of theoryActivities()">
              <strong>{{ act.sort_order }}. {{ act.title }}</strong>
              <p>{{ act.description }}</p>
              <span class="badge" *ngIf="act.completed_at">Completado</span>
              <button
                class="btn btn--ghost"
                *ngIf="!act.completed_at"
                (click)="completeActivity(a.id, act)"
              >
                Marcar completada
              </button>
            </li>
          </ul>
          <h4>Práctica</h4>
          <ul class="module-list">
            <li *ngFor="let act of practiceActivities()">
              <strong>{{ act.sort_order }}. {{ act.title }}</strong>
              <p>{{ act.description }}</p>
              <span class="badge" *ngIf="act.completed_at">Completada</span>
              <button
                class="btn btn--ghost"
                *ngIf="!act.completed_at"
                (click)="completeActivity(a.id, act)"
              >
                Marcar completada
              </button>
            </li>
          </ul>
        </div>

        <h3 class="form-grid__full">Dotación y EPP</h3>
        <label>
          Tipo
          <select [(ngModel)]="endowmentDraft.kind" name="end_kind">
            <option value="epp">EPP (bloquea práctica si falta)</option>
            <option value="dotacion">Dotación general</option>
          </select>
        </label>
        <label class="form-grid__full">
          Items entregados (uno por línea)
          <textarea [(ngModel)]="endowmentDraft.items" name="end_items" rows="3"></textarea>
        </label>
        <input type="file" id="end-sig" hidden (change)="onEndowmentSignature($event)" />
        <button class="btn btn--ghost" (click)="trigger('end-sig')">
          {{ endowmentDraft.signature?.name || 'Adjuntar firma' }}
        </button>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="saveEndowment(a.id)">Registrar entrega</button>
          <button class="btn btn--ghost" (click)="startPractice(a.id)">Iniciar práctica</button>
        </div>
        <ul class="module-list" *ngIf="deliveries().length">
          <li *ngFor="let d of deliveries()">
            <strong>{{ d.kind }}</strong>
            <p class="muted">Entregado {{ d.delivered_at }}</p>
            <p *ngIf="d.signature_file_id">
              <a [href]="api.fileUrl(d.signature_file_id)" target="_blank">Ver firma</a>
            </p>
          </li>
        </ul>

        <h3 class="form-grid__full">Evidencia funcional</h3>
        <label>
          Fase
          <select [(ngModel)]="evidence.phase" name="ev_phase">
            <option value="theory">Teoría</option>
            <option value="practice">Práctica</option>
          </select>
        </label>
        <label>
          Actor
          <select [(ngModel)]="evidence.actor" name="ev_actor">
            <option value="worker">Trabajador</option>
            <option value="evaluator">Evaluador</option>
          </select>
        </label>
        <label class="form-grid__full">
          Notas
          <textarea [(ngModel)]="evidence.notes" name="ev_notes" rows="3"></textarea>
        </label>
        <input type="file" id="ev-files" multiple hidden (change)="onEvidenceFiles($event)" />
        <button class="btn btn--ghost" (click)="trigger('ev-files')">
          {{ evidenceFiles.length ? evidenceFiles.length + ' archivo(s)' : 'Adjuntar archivos' }}
        </button>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="saveEvidence(a.id)">Registrar evidencia</button>
          <button class="btn btn--ghost" (click)="completeFunctional(a.id)">Cerrar onboarding</button>
        </div>
        <p class="success" *ngIf="ok">{{ ok }}</p>
        <p class="error" *ngIf="error">{{ error }}</p>
      </section>
    </section>
    <ng-template #loading><p class="page">Cargando…</p></ng-template>
  `,
  styles: [
    `
      .signature-pad-wrap {
        margin: 14px 0;
      }
      .signature-pad-wrap select {
        margin-bottom: 10px;
        padding: 6px 10px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-outline);
      }
    `,
  ],
})
export class ApplicationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);

  app = signal<ApplicationDetail | null>(null);
  modules = signal<InductionOrgModuleEnriched[]>([]);
  reasons = signal<RejectionReason[]>([]);
  sessions = signal<InterviewSession[]>([]);
  activities = signal<FunctionalActivity[]>([]);
  deliveries = signal<EndowmentDelivery[]>([]);

  theoryActivities = () => this.activities().filter((a) => a.phase === 'theory');
  practiceActivities = () => this.activities().filter((a) => a.phase === 'practice');

  active: Tab = 'data';
  tabs: { id: Tab; label: string }[] = [
    { id: 'data', label: 'Datos' },
    { id: 'documents', label: 'Documentos' },
    { id: 'interviews', label: 'Entrevistas' },
    { id: 'occupational', label: 'Ocupacional / IPS' },
    { id: 'hiring', label: 'Decisión' },
    { id: 'induction', label: 'Inducción' },
    { id: 'functional', label: 'Funcional / EPP' },
  ];

  edit = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    channel: '',
    cv_reference: '',
    requires_vehicle: false,
    notes: '',
  };
  transitionStatus = '';
  transitionReason = '';
  statuses = PIPELINE_STATUSES;
  statusLabel = statusLabel;
  invitationToken = '';

  newSession = { template_id: '' };

  occ = { email_to: '' };
  ips: { outcome: string; recommendations: string; file?: File } = {
    outcome: 'fit',
    recommendations: '',
  };

  hiring: { decision: 'hire' | 'reject'; reason_id?: number; notes: string } = {
    decision: 'hire',
    notes: '',
  };
  hiringMessage = '';

  plan = { manual_summary: '' };
  endowmentDraft: { kind: 'epp' | 'dotacion'; items: string; signature?: File } = {
    kind: 'epp',
    items: '',
  };
  evidence = { phase: 'practice', notes: '', actor: 'worker' };
  evidenceFiles: File[] = [];

  docDrafts: Record<string, UploadDraft> = {};
  canvasKind: 'regulation' | 'policies' | 'contract' = 'regulation';

  ok = '';
  error = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load(id);
    this.api.listInductionModules().subscribe({ next: (m) => this.modules.set(m ?? []) });
    this.api.listRejectionReasons().subscribe({ next: (r) => this.reasons.set(r ?? []) });
    this.api.listInterviewSessions(id).subscribe({ next: (s) => this.sessions.set(s ?? []) });
    this.api.listFunctionalActivities(id).subscribe({ next: (a) => this.activities.set(a ?? []) });
    this.api.listEndowmentDeliveries(id).subscribe({ next: (d) => this.deliveries.set(d ?? []) });
  }

  load(id: string): void {
    this.api.getApplication(id).subscribe({
      next: (a) => {
        this.app.set(a);
        this.edit = {
          first_name: a.first_name,
          last_name: a.last_name,
          email: a.email,
          phone: a.phone,
          channel: a.channel,
          cv_reference: a.cv_reference,
          requires_vehicle: a.requires_vehicle,
          notes: a.notes,
        };
        this.transitionStatus = a.status;
        a.documents.forEach((d) => {
          if (!this.docDrafts[d.checklist_item_id]) this.docDrafts[d.checklist_item_id] = {};
        });
      },
    });
  }

  trigger(id: string): void {
    document.getElementById(id)?.click();
  }

  saveData(): void {
    const id = this.app()?.id;
    if (!id) return;
    this.api.patchApplication(id, this.edit).subscribe({
      next: () => {
        this.ok = 'Cambios guardados';
        this.error = '';
        this.load(id);
      },
      error: (e) => (this.error = e?.error?.error ?? 'Error al guardar'),
    });
  }

  invite(id: string): void {
    this.api.inviteApplicationToPortal(id).subscribe({
      next: (res) => {
        this.invitationToken = res.invitation_token;
        this.ok = 'Invitación generada';
      },
      error: (e) => (this.error = e?.error?.error ?? 'No se pudo invitar'),
    });
  }

  doTransition(): void {
    const id = this.app()?.id;
    if (!id) return;
    this.api.transitionApplication(id, this.transitionStatus, this.transitionReason).subscribe({
      next: () => {
        this.ok = 'Estado actualizado';
        this.error = '';
        this.load(id);
      },
      error: (e) => (this.error = e?.error?.error ?? 'Error en transición'),
    });
  }

  onDocFile(d: ApplicationDocument, ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.docDrafts[d.checklist_item_id] = {
      ...this.docDrafts[d.checklist_item_id],
      file,
    };
  }

  uploadDoc(appId: string, d: ApplicationDocument): void {
    const draft = this.docDrafts[d.checklist_item_id];
    if (!draft?.file) return;
    if (d.requires_issued_at && !draft.issuedAt) {
      this.error = `Debes indicar fecha de emisión de "${d.label}".`;
      return;
    }
    this.api.uploadDocument(appId, d.checklist_item_id, draft.file, draft.issuedAt).subscribe({
      next: () => {
        this.ok = `"${d.label}" subido`;
        this.docDrafts[d.checklist_item_id] = {};
        this.load(appId);
      },
      error: (e) => (this.error = e?.error?.error ?? 'Error al subir'),
    });
  }

  review(appId: string, docId: string, status: string): void {
    const notes = status === 'rejected' ? prompt('Motivo del rechazo:') ?? '' : '';
    this.api.reviewDocument(appId, docId, status, notes).subscribe({ next: () => this.load(appId) });
  }

  toLocal(s: string): string {
    return s ? s.substring(0, 16) : '';
  }

  updateSession<K extends keyof InterviewSession>(s: InterviewSession, key: K, value: InterviewSession[K]): void {
    s[key] = value;
  }

  saveSession(s: InterviewSession): void {
    const body: Record<string, unknown> = {
      modality: s.modality,
      location: s.location,
      interviewer_notes: s.interviewer_notes,
    };
    if (s.scheduled_at) body['scheduled_at'] = new Date(s.scheduled_at).toISOString();
    this.api.patchInterviewSession(s.id, body).subscribe({ next: () => (this.ok = 'Sesión guardada') });
  }

  createSession(appId: string): void {
    if (!this.newSession.template_id) return;
    this.api.createInterviewSession(appId, this.newSession.template_id).subscribe({
      next: () => {
        this.newSession.template_id = '';
        this.api.listInterviewSessions(appId).subscribe({ next: (s) => this.sessions.set(s ?? []) });
      },
      error: (e) => (this.error = e?.error?.error ?? 'No se pudo crear'),
    });
  }

  recordSend(id: string): void {
    this.api.recordOccupationalSend(id, this.occ.email_to).subscribe({
      next: () => (this.ok = 'PDF enviado por correo a la IPS'),
      error: (e) => (this.error = e?.error?.error ?? 'No se pudo enviar'),
    });
  }

  onIPSFile(ev: Event): void {
    this.ips.file = (ev.target as HTMLInputElement).files?.[0];
  }

  recordIPS(id: string): void {
    if (this.ips.file) {
      this.api
        .uploadIPSResultFile(id, this.ips.outcome, this.ips.recommendations, this.ips.file)
        .subscribe({
          next: () => {
            this.ok = 'Resultado guardado con archivo';
            this.load(id);
          },
        });
    } else {
      this.api.recordIPSResult(id, this.ips.outcome, this.ips.recommendations).subscribe({
        next: () => {
          this.ok = 'Resultado guardado';
          this.load(id);
        },
      });
    }
  }

  hireDisabled(): boolean {
    return !this.auth.hasRole('admin', 'hiring_manager');
  }

  hasDraftFile(itemId: string): boolean {
    return !!this.docDrafts[itemId]?.file;
  }

  decide(appId: string, decision: 'hire' | 'reject'): void {
    this.hiring.decision = decision;
    this.api.hiringDecision(appId, decision, this.hiring.reason_id, this.hiring.notes).subscribe({
      next: (res) => {
        this.hiringMessage =
          decision === 'hire'
            ? `Contratado. Código de portal: ${res.invitation_token}`
            : 'Postulación rechazada.';
        this.load(appId);
      },
      error: (e) => (this.error = e?.error?.error ?? 'Error en decisión'),
    });
  }

  markProgress(appId: string, moduleId: string): void {
    this.api.markOrgProgress(appId, moduleId).subscribe({ next: () => (this.ok = 'Avance registrado') });
  }

  uploadSignature(appId: string, kind: string, ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadInductionSignature(appId, kind, file).subscribe({
      next: () => (this.ok = 'Firma cargada'),
      error: (e) => (this.error = e?.error?.error ?? 'Error al firmar'),
    });
  }

  signCanvas(appId: string, dataURI: string): void {
    this.api.uploadInductionSignatureBase64(appId, this.canvasKind, dataURI).subscribe({
      next: () => (this.ok = `Firma (${this.canvasKind}) registrada`),
      error: (e) => (this.error = e?.error?.error ?? 'Error al firmar'),
    });
  }

  completeOrg(id: string): void {
    this.api.completeInductionOrg(id).subscribe({ next: () => this.load(id) });
  }

  savePlan(id: string): void {
    this.api.ensureFunctionalPlan(id, this.plan.manual_summary).subscribe({
      next: () => (this.ok = 'Plan guardado'),
    });
  }

  closeTheory(id: string): void {
    this.api.completeTheory(id).subscribe({
      next: () => this.load(id),
      error: (e) => (this.error = e?.error?.error ?? 'No se puede cerrar teoría'),
    });
  }

  completeActivity(appId: string, act: FunctionalActivity): void {
    const notes = prompt(`Notas para "${act.title}":`) ?? '';
    this.api.completeFunctionalActivity(appId, act.id, notes).subscribe({
      next: () => {
        this.ok = `Actividad "${act.title}" completada`;
        this.api.listFunctionalActivities(appId).subscribe({ next: (a) => this.activities.set(a ?? []) });
      },
      error: (e) => (this.error = e?.error?.error ?? 'No se pudo completar'),
    });
  }

  onEndowmentSignature(ev: Event): void {
    this.endowmentDraft.signature = (ev.target as HTMLInputElement).files?.[0];
  }

  saveEndowment(id: string): void {
    const items = this.endowmentDraft.items
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((label) => ({ label }));
    this.api
      .recordEndowmentDelivery(id, this.endowmentDraft.kind, items, this.endowmentDraft.signature)
      .subscribe({
        next: () => {
          this.ok = 'Entrega registrada';
          this.api.listEndowmentDeliveries(id).subscribe({ next: (d) => this.deliveries.set(d ?? []) });
        },
        error: (e) => (this.error = e?.error?.error ?? 'Error al registrar'),
      });
  }

  startPractice(id: string): void {
    this.api.startPractice(id).subscribe({
      next: () => {
        this.ok = 'Práctica iniciada';
        this.load(id);
      },
      error: (e) => (this.error = e?.error?.error ?? 'No se pudo iniciar práctica'),
    });
  }

  onEvidenceFiles(ev: Event): void {
    this.evidenceFiles = Array.from((ev.target as HTMLInputElement).files ?? []);
  }

  saveEvidence(id: string): void {
    this.api
      .addFunctionalEvidence(id, {
        phase: this.evidence.phase,
        notes: this.evidence.notes,
        actor: this.evidence.actor,
        files: this.evidenceFiles,
      })
      .subscribe({
        next: () => {
          this.ok = 'Evidencia registrada';
          this.evidence.notes = '';
          this.evidenceFiles = [];
        },
      });
  }

  completeFunctional(id: string): void {
    this.api.completeFunctional(id).subscribe({
      next: () => this.load(id),
      error: (e) => (this.error = e?.error?.error ?? 'No se puede cerrar'),
    });
  }
}
