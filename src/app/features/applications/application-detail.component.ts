import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import {
  ApplicationDetail,
  InductionOrgModule,
  InterviewSession,
  PIPELINE_STATUSES,
  RejectionReason,
  statusLabel,
} from '../../core/types';

type Tab = 'data' | 'documents' | 'interviews' | 'occupational' | 'induction' | 'functional';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
        <label>
          Nombre
          <input [(ngModel)]="edit.first_name" name="first_name" />
        </label>
        <label>
          Apellido
          <input [(ngModel)]="edit.last_name" name="last_name" />
        </label>
        <label>
          Email
          <input [(ngModel)]="edit.email" name="email" type="email" />
        </label>
        <label>
          Teléfono
          <input [(ngModel)]="edit.phone" name="phone" />
        </label>
        <label>
          Canal
          <input [(ngModel)]="edit.channel" name="channel" placeholder="WhatsApp, email, web…" />
        </label>
        <label>
          Referencia CV
          <input [(ngModel)]="edit.cv_reference" name="cv_reference" />
        </label>
        <label class="form-grid__check">
          <input
            type="checkbox"
            [(ngModel)]="edit.requires_vehicle"
            name="requires_vehicle"
          />
          Requiere documentos de vehículo
        </label>
        <label class="form-grid__full">
          Notas internas
          <textarea [(ngModel)]="edit.notes" name="notes" rows="4"></textarea>
        </label>
        <div class="form-actions form-grid__full">
          <button class="btn btn--primary" type="button" (click)="saveData()">
            Guardar cambios
          </button>
        </div>

        <fieldset class="transition-block form-grid__full">
          <legend>Cambiar estado</legend>
          <select [(ngModel)]="transitionStatus" name="ts">
            <option *ngFor="let s of statuses" [value]="s.value">{{ s.label }}</option>
          </select>
          <select
            *ngIf="transitionStatus === 'rejected'"
            [(ngModel)]="transitionReason"
            name="tr"
          >
            <option value="">Motivo…</option>
            <option *ngFor="let r of reasons()" [value]="r.label">{{ r.label }}</option>
          </select>
          <button class="btn btn--primary" type="button" (click)="doTransition()">Aplicar</button>
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
                  (change)="upload(a.id, d.checklist_item_id, $event)"
                />
                <button
                  class="btn btn--ghost"
                  type="button"
                  (click)="triggerInput('file-' + d.checklist_item_id)"
                >
                  Subir
                </button>
                <button
                  class="btn btn--ghost"
                  *ngIf="d.file_id"
                  (click)="review(a.id, d.id, 'approved')"
                >
                  Aprobar
                </button>
                <button
                  class="btn btn--ghost"
                  *ngIf="d.file_id"
                  (click)="review(a.id, d.id, 'rejected')"
                >
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

      <!-- Ocupacional -->
      <section *ngIf="active === 'occupational'" class="card form-grid">
        <p>
          <a [href]="api.occupationalPdfUrl(a.id)" target="_blank">Descargar PDF prellenado</a>
          y enviarlo a la IPS.
        </p>
        <label>
          Email IPS
          <input [(ngModel)]="occ.email_to" name="occ_email" type="email" />
        </label>
        <div class="form-actions">
          <button class="btn btn--primary" type="button" (click)="recordSend(a.id)">
            Registrar envío
          </button>
        </div>
        <hr class="hr" />
        <h3>Resultado IPS</h3>
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
        <div class="form-actions">
          <button class="btn btn--primary" type="button" (click)="recordIPS(a.id)">
            Guardar resultado
          </button>
        </div>
      </section>

      <!-- Inducción organizacional -->
      <section *ngIf="active === 'induction'" class="card">
        <h2>Módulos organizacionales</h2>
        <ul class="module-list">
          <li *ngFor="let m of modules()">
            <strong>{{ m.title }}</strong>
            <p>{{ m.body }}</p>
            <button class="btn btn--ghost" (click)="markProgress(a.id, m.id)">
              Marcar como visto
            </button>
          </li>
        </ul>

        <h3>Firmas (reglamento, políticas, contrato)</h3>
        <div class="signature-grid">
          <div *ngFor="let kind of ['regulation','policies','contract']">
            <p class="signature-grid__label">{{ kind }}</p>
            <input
              type="file"
              [id]="'sig-' + kind"
              hidden
              (change)="uploadSignature(a.id, kind, $event)"
            />
            <button class="btn btn--ghost" (click)="triggerInput('sig-' + kind)">
              Subir firma
            </button>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn--primary" type="button" (click)="completeOrg(a.id)">
            Cerrar inducción organizacional
          </button>
        </div>
      </section>

      <!-- Plan funcional / EPP -->
      <section *ngIf="active === 'functional'" class="card form-grid">
        <h2>Plan funcional</h2>
        <label class="form-grid__full">
          Resumen del manual de funciones
          <textarea [(ngModel)]="plan.manual_summary" name="plan_summary" rows="4"></textarea>
        </label>
        <div class="form-actions">
          <button class="btn btn--primary" type="button" (click)="savePlan(a.id)">Guardar</button>
          <button class="btn btn--ghost" type="button" (click)="closeTheory(a.id)">
            Marcar teoría completa
          </button>
        </div>

        <h3 class="form-grid__full">Entrega EPP</h3>
        <label class="form-grid__full">
          Ítems entregados (uno por línea)
          <textarea [(ngModel)]="eppItemsText" name="epp_items" rows="3"></textarea>
        </label>
        <input
          type="file"
          id="epp-sig"
          hidden
          (change)="onEppSignature($event)"
        />
        <button class="btn btn--ghost" type="button" (click)="triggerInput('epp-sig')">
          {{ eppSignature ? eppSignature.name : 'Adjuntar firma EPP' }}
        </button>
        <div class="form-actions">
          <button class="btn btn--primary" type="button" (click)="saveEpp(a.id)">
            Registrar entrega
          </button>
          <button class="btn btn--ghost" type="button" (click)="startPractice(a.id)">
            Iniciar práctica
          </button>
        </div>

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
        <button class="btn btn--ghost" type="button" (click)="triggerInput('ev-files')">
          {{ evidenceFiles.length ? evidenceFiles.length + ' archivo(s) seleccionados' : 'Adjuntar archivos' }}
        </button>
        <div class="form-actions">
          <button class="btn btn--primary" type="button" (click)="saveEvidence(a.id)">
            Registrar evidencia
          </button>
          <button class="btn btn--ghost" type="button" (click)="completeFunctional(a.id)">
            Cerrar onboarding
          </button>
        </div>
        <p class="success" *ngIf="ok">{{ ok }}</p>
        <p class="error" *ngIf="error">{{ error }}</p>
      </section>
    </section>
    <ng-template #loading><p class="page">Cargando…</p></ng-template>
  `,
})
export class ApplicationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly api = inject(ApiService);

  app = signal<ApplicationDetail | null>(null);
  modules = signal<InductionOrgModule[]>([]);
  reasons = signal<RejectionReason[]>([]);
  sessions = signal<InterviewSession[]>([]);

  active: Tab = 'data';
  tabs: { id: Tab; label: string }[] = [
    { id: 'data', label: 'Datos' },
    { id: 'documents', label: 'Documentos' },
    { id: 'interviews', label: 'Entrevistas' },
    { id: 'occupational', label: 'Ocupacional / IPS' },
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

  newSession = { template_id: '' };

  occ = { email_to: '' };
  ips = { outcome: 'fit', recommendations: '' };

  plan = { manual_summary: '' };
  eppItemsText = '';
  eppSignature: File | null = null;
  evidence = { phase: 'practice', notes: '', actor: 'worker' };
  evidenceFiles: File[] = [];

  ok = '';
  error = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.load(id);
    this.api.listInductionModules().subscribe({ next: (m) => this.modules.set(m ?? []) });
    this.api.listRejectionReasons().subscribe({ next: (r) => this.reasons.set(r ?? []) });
    this.api.listInterviewSessions(id).subscribe({ next: (s) => this.sessions.set(s ?? []) });
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
      },
    });
  }

  triggerInput(id: string): void {
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

  doTransition(): void {
    const id = this.app()?.id;
    if (!id) return;
    this.api
      .transitionApplication(id, this.transitionStatus, this.transitionReason)
      .subscribe({
        next: () => {
          this.ok = 'Estado actualizado';
          this.error = '';
          this.load(id);
        },
        error: (e) => (this.error = e?.error?.error ?? 'Error en transición'),
      });
  }

  upload(appId: string, itemId: string, ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadDocument(appId, itemId, file).subscribe({
      next: () => this.load(appId),
      error: (e) => (this.error = e?.error?.error ?? 'Error al subir'),
    });
  }

  review(appId: string, docId: string, status: string): void {
    const notes = status === 'rejected' ? prompt('Motivo del rechazo:') ?? '' : '';
    this.api.reviewDocument(appId, docId, status, notes).subscribe({
      next: () => this.load(appId),
    });
  }

  toLocal(s: string): string {
    return s ? s.substring(0, 16) : '';
  }

  updateSession<K extends keyof InterviewSession>(
    s: InterviewSession,
    key: K,
    value: InterviewSession[K]
  ): void {
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
      next: () => (this.ok = 'Envío registrado'),
    });
  }

  recordIPS(id: string): void {
    this.api.recordIPSResult(id, this.ips.outcome, this.ips.recommendations).subscribe({
      next: () => {
        this.ok = 'Resultado guardado';
        this.load(id);
      },
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

  completeOrg(id: string): void {
    this.api.completeInductionOrg(id).subscribe({ next: () => this.load(id) });
  }

  savePlan(id: string): void {
    this.api.ensureFunctionalPlan(id, this.plan.manual_summary).subscribe({
      next: () => (this.ok = 'Plan guardado'),
    });
  }

  closeTheory(id: string): void {
    this.api.completeTheory(id).subscribe({ next: () => this.load(id) });
  }

  onEppSignature(ev: Event): void {
    this.eppSignature = (ev.target as HTMLInputElement).files?.[0] ?? null;
  }

  saveEpp(id: string): void {
    const items = this.eppItemsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((label) => ({ label }));
    this.api.recordEPPDelivery(id, items, this.eppSignature ?? undefined).subscribe({
      next: () => (this.ok = 'EPP registrado'),
      error: (e) => (this.error = e?.error?.error ?? 'Error al registrar EPP'),
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
    this.api.completeFunctional(id).subscribe({ next: () => this.load(id) });
  }

  // forkJoin reservado por si se necesitan recargas paralelas
  protected readonly _join = forkJoin;
}
