import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
  statusBadgeClass,
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

interface PipelinePhase {
  key: string;
  label: string;
  matches: string[];
}

const PIPELINE_PHASES: PipelinePhase[] = [
  { key: 'apply', label: 'Postulación', matches: ['applied'] },
  {
    key: 'docs',
    label: 'Documentos',
    matches: ['docs_pending', 'docs_incomplete', 'docs_review', 'docs_approved'],
  },
  {
    key: 'interview',
    label: 'Entrevista',
    matches: ['interview_pending', 'interview_done'],
  },
  {
    key: 'occ',
    label: 'Ocupacional',
    matches: ['occ_pending', 'occ_sent', 'occ_result_received'],
  },
  { key: 'decision', label: 'Decisión', matches: ['hiring_pending', 'hired', 'rejected'] },
  {
    key: 'induction',
    label: 'Inducción',
    matches: [
      'induction_org',
      'induction_org_done',
      'induction_theory',
      'induction_epp_pending',
      'induction_practice',
    ],
  },
  { key: 'onboarding', label: 'Onboarding', matches: ['onboarding_complete'] },
];

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SignaturePadComponent],
  template: `
    <section class="page" *ngIf="app() as a; else loading">
      <a routerLink="/applications" class="back-link">
        <span class="icon icon--sm">arrow_back</span> Postulaciones
      </a>

      <header class="detail-head">
        <div class="detail-head__main">
          <span class="avatar avatar--lg">{{ initials(a) }}</span>
          <div>
            <h1 class="detail-head__title">{{ a.first_name }} {{ a.last_name }}</h1>
            <p class="detail-head__meta">
              <span class="icon icon--sm">mail</span> {{ a.email }}
              · <span class="icon icon--sm">call</span> {{ a.phone || '—' }}
              <ng-container *ngIf="a.channel"> · canal {{ a.channel }}</ng-container>
            </p>
          </div>
        </div>
        <div class="detail-head__status">
          <span class="badge badge--lg" [class]="'badge badge--lg ' + badgeClass(a.status)">
            {{ statusLabel(a.status) }}
          </span>
          <small *ngIf="a.completeness as c">
            Documentos {{ c.required_satisfied }}/{{ c.required_total }} obligatorios
          </small>
        </div>
      </header>

      <article class="card" style="padding: 8px 18px;">
        <div class="pipeline-timeline">
          <div
            *ngFor="let phase of phases(); let i = index"
            class="pipeline-timeline__step"
            [class.is-done]="phase.state === 'done'"
            [class.is-current]="phase.state === 'current'"
          >
            <div class="pipeline-timeline__node">
              <span *ngIf="phase.state === 'done'" class="icon icon--sm">check</span>
              <span *ngIf="phase.state !== 'done'">{{ i + 1 }}</span>
            </div>
            <div class="pipeline-timeline__name">{{ phase.label }}</div>
          </div>
        </div>
      </article>

      <div class="tabs">
        <button
          *ngFor="let t of tabs"
          [class.is-active]="active === t.id"
          (click)="active = t.id"
          type="button"
        >
          <span class="icon icon--sm">{{ t.icon }}</span>
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
          <button class="btn btn--ghost" (click)="invite(a.id)">
            <span class="icon icon--sm">forward_to_inbox</span>
            {{ invitationToken ? 'Reenviar invitación' : 'Invitar al portal' }}
          </button>
          <button class="btn btn--primary" (click)="saveData()">
            <span class="icon icon--sm">save</span>
            Guardar cambios
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
          <button class="btn btn--primary" (click)="doTransition()">
            <span class="icon icon--sm">play_arrow</span>
            Aplicar
          </button>
        </fieldset>
      </section>

      <!-- Documentos -->
      <section *ngIf="active === 'documents'" class="card">
        <div class="card-section-head">
          <h2>Checklist documental</h2>
          <span class="badge badge--soft" *ngIf="a.completeness as c">
            {{ c.required_satisfied }}/{{ c.required_total }} obligatorios
          </span>
        </div>
        <table class="data-table data-table--docs">
          <thead>
            <tr><th>Documento</th><th>Estado</th><th>Archivo</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let d of a.documents">
              <td>
                <strong>{{ d.label }}</strong>
                <div class="row" style="gap:6px; margin-top:4px;">
                  <span class="badge badge--neutral" *ngIf="d.required">Obligatorio</span>
                  <span class="badge badge--soft" *ngIf="d.requires_template">Plantilla</span>
                  <span class="badge badge--soft" *ngIf="d.requires_issued_at">Fecha emisión</span>
                </div>
                <p class="muted" *ngIf="d.max_age_days">
                  Máx. {{ d.max_age_days }} días de antigüedad
                </p>
                <p class="muted" *ngIf="d.issued_at">Emitido: {{ d.issued_at }}</p>
              </td>
              <td>
                <span class="badge" [class]="'badge ' + docBadgeClass(d.review_status)">
                  {{ docStatusLabel(d.review_status) }}
                </span>
              </td>
              <td>
                <a *ngIf="d.file_id" [href]="api.fileUrl(d.file_id)" target="_blank">
                  <span class="icon icon--sm">download</span> Descargar
                </a>
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
                  <span class="icon icon--sm">attach_file</span>
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
                  <span class="icon icon--sm">upload</span>
                  Subir
                </button>
                <button class="btn btn--ghost" *ngIf="d.file_id" (click)="review(a.id, d.id, 'approved')">
                  <span class="icon icon--sm">check</span>
                  Aprobar
                </button>
                <button class="btn btn--ghost btn--danger" *ngIf="d.file_id" (click)="review(a.id, d.id, 'rejected')">
                  <span class="icon icon--sm">close</span>
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
            <button class="btn btn--primary" (click)="createSession(a.id)">
              <span class="icon icon--sm">add</span>
              Crear sesión
            </button>
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
                <button class="btn btn--ghost" (click)="saveSession(s)">
                  <span class="icon icon--sm">save</span>
                  Guardar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #noSessions><p class="empty">Sin sesiones registradas.</p></ng-template>
      </section>

      <!-- Ocupacional / IPS -->
      <section *ngIf="active === 'occupational'" class="card form-grid">
        <p class="form-grid__full">
          <a [href]="api.occupationalPdfUrl(a.id)" target="_blank">
            <span class="icon icon--sm">picture_as_pdf</span> Descargar PDF prellenado
          </a>.
          Al "Enviar a IPS" se anexa este PDF al correo automáticamente.
        </p>
        <label>Email IPS<input [(ngModel)]="occ.email_to" name="occ_email" type="email" /></label>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="recordSend(a.id)">
            <span class="icon icon--sm">send</span>
            Enviar a IPS
          </button>
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
          <span class="icon icon--sm">attach_file</span>
          {{ ips.file?.name || 'Adjuntar PDF de la IPS' }}
        </button>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="recordIPS(a.id)">
            <span class="icon icon--sm">save</span>
            Guardar resultado
          </button>
        </div>
      </section>

      <!-- Decisión de empleador -->
      <section *ngIf="active === 'hiring'" class="card form-grid">
        <h2 class="form-grid__full" style="margin:0;">Decisión final</h2>
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
            <span class="icon icon--sm">check_circle</span>
            Contratar
          </button>
          <button class="btn btn--danger" (click)="decide(a.id, 'reject')" [disabled]="hireDisabled()">
            <span class="icon icon--sm">cancel</span>
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
        <div class="card-section-head"><h2>Módulos organizacionales</h2></div>
        <ul class="module-list">
          <li *ngFor="let m of modules()">
            <strong>{{ m.title }}</strong>
            <p>{{ m.body }}</p>
            <p class="muted" *ngIf="m.media?.length">
              {{ m.media!.length }} recurso(s) audiovisual(es) · auto-tracking en el portal
            </p>
            <button class="btn btn--ghost" (click)="markProgress(a.id, m.id)">
              <span class="icon icon--sm">visibility</span>
              Marcar visto
            </button>
          </li>
        </ul>

        <div class="card-section-head" style="margin-top: 28px;">
          <h2>Firmas</h2>
        </div>
        <p class="page-subtitle">
          El trabajador puede firmar desde el portal con canvas. Aquí RR.HH. puede subir un archivo escaneado.
        </p>
        <div class="signature-grid">
          <div *ngFor="let kind of ['regulation','policies','contract']">
            <p class="signature-grid__label">{{ kind }}</p>
            <input type="file" [id]="'sig-' + kind" hidden (change)="uploadSignature(a.id, kind, $event)" />
            <button class="btn btn--ghost" (click)="trigger('sig-' + kind)">
              <span class="icon icon--sm">upload</span>
              Subir firma
            </button>
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
            <span class="icon icon--sm">check_circle</span>
            Cerrar inducción organizacional
          </button>
        </div>
      </section>

      <!-- Plan funcional / Dotación / EPP / Cronograma -->
      <section *ngIf="active === 'functional'" class="card form-grid">
        <h2 class="form-grid__full" style="margin:0;">Plan funcional</h2>
        <label class="form-grid__full">
          Resumen del manual
          <textarea [(ngModel)]="plan.manual_summary" name="plan_summary" rows="4"></textarea>
        </label>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="savePlan(a.id)">
            <span class="icon icon--sm">save</span>
            Guardar
          </button>
          <button class="btn btn--ghost" (click)="closeTheory(a.id)">
            <span class="icon icon--sm">menu_book</span>
            Marcar teoría completa
          </button>
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
              <span class="badge badge--success" *ngIf="act.completed_at">Completado</span>
              <button
                class="btn btn--ghost"
                *ngIf="!act.completed_at"
                (click)="completeActivity(a.id, act)"
              >
                <span class="icon icon--sm">task_alt</span>
                Marcar completada
              </button>
            </li>
          </ul>
          <h4>Práctica</h4>
          <ul class="module-list">
            <li *ngFor="let act of practiceActivities()">
              <strong>{{ act.sort_order }}. {{ act.title }}</strong>
              <p>{{ act.description }}</p>
              <span class="badge badge--success" *ngIf="act.completed_at">Completada</span>
              <button
                class="btn btn--ghost"
                *ngIf="!act.completed_at"
                (click)="completeActivity(a.id, act)"
              >
                <span class="icon icon--sm">task_alt</span>
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
          <span class="icon icon--sm">attach_file</span>
          {{ endowmentDraft.signature?.name || 'Adjuntar firma' }}
        </button>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="saveEndowment(a.id)">
            <span class="icon icon--sm">save</span>
            Registrar entrega
          </button>
          <button class="btn btn--ghost" (click)="startPractice(a.id)">
            <span class="icon icon--sm">play_circle</span>
            Iniciar práctica
          </button>
        </div>
        <ul class="module-list" *ngIf="deliveries().length">
          <li *ngFor="let d of deliveries()">
            <strong>{{ d.kind === 'epp' ? 'EPP' : 'Dotación' }}</strong>
            <p class="muted">Entregado {{ d.delivered_at }}</p>
            <p *ngIf="d.signature_file_id">
              <a [href]="api.fileUrl(d.signature_file_id)" target="_blank">
                <span class="icon icon--sm">draw</span> Ver firma
              </a>
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
          <span class="icon icon--sm">attach_file</span>
          {{ evidenceFiles.length ? evidenceFiles.length + ' archivo(s)' : 'Adjuntar archivos' }}
        </button>
        <div class="form-actions">
          <button class="btn btn--primary" (click)="saveEvidence(a.id)">
            <span class="icon icon--sm">save</span>
            Registrar evidencia
          </button>
          <button class="btn btn--ghost" (click)="completeFunctional(a.id)">
            <span class="icon icon--sm">verified</span>
            Cerrar onboarding
          </button>
        </div>
        <p class="success form-grid__full" *ngIf="ok">{{ ok }}</p>
        <p class="error form-grid__full" *ngIf="error">{{ error }}</p>
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
      .data-table--docs td {
        vertical-align: top;
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
  tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'data', label: 'Datos', icon: 'badge' },
    { id: 'documents', label: 'Documentos', icon: 'folder_shared' },
    { id: 'interviews', label: 'Entrevistas', icon: 'forum' },
    { id: 'occupational', label: 'Ocupacional / IPS', icon: 'medical_services' },
    { id: 'hiring', label: 'Decisión', icon: 'how_to_vote' },
    { id: 'induction', label: 'Inducción', icon: 'school' },
    { id: 'functional', label: 'Funcional / EPP', icon: 'engineering' },
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
  badgeClass = statusBadgeClass;
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

  /**
   * Construye la línea de tiempo del pipeline marcando fases completadas
   * (anteriores al estado actual), la fase activa y las pendientes.
   */
  phases = computed(() => {
    const current = this.app()?.status ?? '';
    if (!current) return PIPELINE_PHASES.map((p) => ({ ...p, state: 'pending' as const }));
    const idx = PIPELINE_PHASES.findIndex((p) => p.matches.includes(current));
    return PIPELINE_PHASES.map((p, i) => ({
      ...p,
      state:
        idx === -1
          ? ('pending' as const)
          : i < idx
            ? ('done' as const)
            : i === idx
              ? ('current' as const)
              : ('pending' as const),
    }));
  });

  initials(a: ApplicationDetail): string {
    const f = (a.first_name?.[0] ?? '').toUpperCase();
    const l = (a.last_name?.[0] ?? '').toUpperCase();
    return (f + l) || '?';
  }

  docStatusLabel(s: string): string {
    return s === 'approved' ? 'Aprobado' : s === 'rejected' ? 'Rechazado' : 'Pendiente';
  }

  docBadgeClass(s: string): string {
    return s === 'approved'
      ? 'badge--success'
      : s === 'rejected'
        ? 'badge--error'
        : 'badge--neutral';
  }

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
