import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApplicationDetail,
  ApplicationListItem,
  Completeness,
  DocumentType,
  EndowmentDelivery,
  FunctionalActivity,
  InductionOrgModule,
  InductionOrgModuleEnriched,
  InterviewSession,
  OutboxMessage,
  OverdueApplication,
  RejectionReason,
  RoleManual,
  User,
  Vacancy,
} from './types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ----- Vacantes -----
  listVacancies(): Observable<Vacancy[]> {
    return this.http.get<Vacancy[]>(`${this.base}/vacancies`);
  }
  getVacancy(id: string): Observable<Vacancy> {
    return this.http.get<Vacancy>(`${this.base}/vacancies/${id}`);
  }
  createVacancy(body: Partial<Vacancy>) {
    return this.http.post<{ id: string; public_slug: string }>(
      `${this.base}/vacancies`,
      body
    );
  }
  patchVacancy(id: string, body: Partial<Vacancy>) {
    return this.http.patch(`${this.base}/vacancies/${id}`, body);
  }
  publishVacancy(id: string) {
    return this.http.post(`${this.base}/vacancies/${id}/publish`, {});
  }
  archiveVacancy(id: string) {
    return this.http.post(`${this.base}/vacancies/${id}/archive`, {});
  }

  // ----- Postulaciones -----
  listApplications(opts: {
    vacancy_id?: string;
    status?: string;
    q?: string;
  } = {}): Observable<ApplicationListItem[]> {
    const params: Record<string, string> = {};
    if (opts.vacancy_id) params['vacancy_id'] = opts.vacancy_id;
    if (opts.status) params['status'] = opts.status;
    if (opts.q) params['q'] = opts.q;
    return this.http.get<ApplicationListItem[]>(`${this.base}/applications`, { params });
  }
  getApplication(id: string): Observable<ApplicationDetail> {
    return this.http.get<ApplicationDetail>(`${this.base}/applications/${id}`);
  }
  patchApplication(id: string, body: Record<string, unknown>) {
    return this.http.patch(`${this.base}/applications/${id}`, body);
  }
  transitionApplication(id: string, status: string, reason?: string) {
    return this.http.post(`${this.base}/applications/${id}/transition`, { status, reason });
  }
  getCompleteness(id: string): Observable<Completeness> {
    return this.http.get<Completeness>(`${this.base}/applications/${id}/completeness`);
  }
  uploadDocument(id: string, itemId: string, file: File, issuedAt?: string) {
    const fd = new FormData();
    fd.append('file', file);
    if (issuedAt) fd.append('issued_at', issuedAt);
    return this.http.post<{ file_id: string }>(
      `${this.base}/applications/${id}/documents/${itemId}/upload`,
      fd
    );
  }
  reviewDocument(id: string, docId: string, review_status: string, notes: string) {
    return this.http.patch(`${this.base}/applications/${id}/documents/${docId}/review`, {
      review_status,
      notes,
    });
  }
  fileUrl(fid: string): string {
    return `${this.base}/files/${fid}`;
  }

  // ----- Entrevistas -----
  createInterviewTemplate(title: string, vacancy_id?: string) {
    return this.http.post<{ id: string }>(`${this.base}/interview-templates`, { title, vacancy_id });
  }
  addInterviewQuestion(tid: string, body: Record<string, unknown>) {
    return this.http.post<{ id: string }>(`${this.base}/interview-templates/${tid}/questions`, body);
  }
  listInterviewSessions(applicationId: string): Observable<InterviewSession[]> {
    return this.http.get<InterviewSession[]>(
      `${this.base}/applications/${applicationId}/interview-sessions`
    );
  }
  createInterviewSession(applicationId: string, template_id: string) {
    return this.http.post<{ session_id: string }>(
      `${this.base}/applications/${applicationId}/interview-sessions`,
      { template_id }
    );
  }
  patchInterviewSession(sid: string, body: Record<string, unknown>) {
    return this.http.patch(`${this.base}/interview-sessions/${sid}`, body);
  }
  putInterviewResponses(sid: string, responses: Record<string, unknown>) {
    return this.http.put(`${this.base}/interview-sessions/${sid}/responses`, { responses });
  }

  // ----- Ocupacional / IPS -----
  occupationalPdfUrl(applicationId: string): string {
    return `${this.base}/applications/${applicationId}/occupational.pdf`;
  }
  recordOccupationalSend(applicationId: string, email_to: string) {
    return this.http.post(`${this.base}/applications/${applicationId}/occupational/send`, {
      email_to,
    });
  }
  recordIPSResult(applicationId: string, outcome: string, recommendations: string) {
    return this.http.post(`${this.base}/applications/${applicationId}/ips-result`, {
      outcome,
      recommendations,
    });
  }
  uploadIPSResultFile(applicationId: string, outcome: string, recommendations: string, file?: File) {
    const fd = new FormData();
    fd.append('outcome', outcome);
    fd.append('recommendations', recommendations);
    if (file) fd.append('file', file);
    return this.http.patch(
      `${this.base}/applications/${applicationId}/ips-result/upload`,
      fd
    );
  }

  // ----- Inducción -----
  listInductionModules(): Observable<InductionOrgModuleEnriched[]> {
    return this.http.get<InductionOrgModuleEnriched[]>(`${this.base}/induction/org-modules`);
  }
  createInductionModule(body: Partial<InductionOrgModule>) {
    return this.http.post<{ id: string }>(`${this.base}/induction/org-modules`, body);
  }
  uploadInductionMedia(
    moduleId: string,
    kind: string,
    title: string,
    file: File,
    sortOrder = 0,
    durationSeconds?: number
  ) {
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('title', title);
    fd.append('sort_order', String(sortOrder));
    if (durationSeconds != null) fd.append('duration_seconds', String(durationSeconds));
    fd.append('file', file);
    return this.http.post<{ id: string; file_id: string }>(
      `${this.base}/induction/org-modules/${moduleId}/media`,
      fd
    );
  }
  deleteInductionMedia(mediaId: string) {
    return this.http.delete(`${this.base}/induction/org-media/${mediaId}`);
  }
  markOrgProgress(applicationId: string, module_id: string) {
    return this.http.post(`${this.base}/applications/${applicationId}/induction/org-progress`, {
      module_id,
    });
  }
  uploadInductionSignature(applicationId: string, kind: string, file: File) {
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('file', file);
    return this.http.post(
      `${this.base}/applications/${applicationId}/induction/signatures`,
      fd
    );
  }
  uploadInductionSignatureBase64(applicationId: string, kind: string, dataURI: string) {
    return this.http.post(
      `${this.base}/applications/${applicationId}/induction/signatures`,
      { kind, signature_data: dataURI }
    );
  }
  completeInductionOrg(applicationId: string) {
    return this.http.post(`${this.base}/applications/${applicationId}/induction/org/complete`, {});
  }

  // ----- Plan funcional / EPP -----
  ensureFunctionalPlan(applicationId: string, manual_summary: string) {
    return this.http.post(`${this.base}/applications/${applicationId}/functional-plan`, {
      manual_summary,
    });
  }
  completeTheory(applicationId: string) {
    return this.http.post(
      `${this.base}/applications/${applicationId}/functional/theory-complete`,
      {}
    );
  }
  recordEPPDelivery(applicationId: string, items: unknown[], signature?: File) {
    if (signature) {
      const fd = new FormData();
      fd.append('items', JSON.stringify(items));
      fd.append('signature', signature);
      return this.http.post(`${this.base}/applications/${applicationId}/epp-delivery`, fd);
    }
    return this.http.post(`${this.base}/applications/${applicationId}/epp-delivery`, { items });
  }
  startPractice(applicationId: string) {
    return this.http.post(
      `${this.base}/applications/${applicationId}/functional/practice-start`,
      {}
    );
  }
  addFunctionalEvidence(
    applicationId: string,
    body: { phase: string; notes: string; actor: string; files?: File[] }
  ) {
    if (body.files?.length) {
      const fd = new FormData();
      fd.append('phase', body.phase);
      fd.append('notes', body.notes);
      fd.append('actor', body.actor);
      body.files.forEach((f) => fd.append('files', f));
      return this.http.post(
        `${this.base}/applications/${applicationId}/functional/evidence`,
        fd
      );
    }
    return this.http.post(`${this.base}/applications/${applicationId}/functional/evidence`, {
      phase: body.phase,
      notes: body.notes,
      actor: body.actor,
    });
  }
  completeFunctional(applicationId: string) {
    return this.http.post(`${this.base}/applications/${applicationId}/functional/complete`, {});
  }

  // ----- Catálogos -----
  listRejectionReasons(): Observable<RejectionReason[]> {
    return this.http.get<RejectionReason[]>(`${this.base}/catalogs/rejection-reasons`);
  }
  createRejectionReason(label: string) {
    return this.http.post<RejectionReason>(`${this.base}/catalogs/rejection-reasons`, { label });
  }
  deleteRejectionReason(id: number) {
    return this.http.delete(`${this.base}/catalogs/rejection-reasons/${id}`);
  }

  // ----- Usuarios -----
  listUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users`);
  }
  createUser(body: { email: string; password: string; full_name: string; role: string }) {
    return this.http.post<{ id: string }>(`${this.base}/users`, body);
  }
  patchUser(id: string, body: Record<string, unknown>) {
    return this.http.patch(`${this.base}/users/${id}`, body);
  }
  deactivateUser(id: string) {
    return this.http.delete(`${this.base}/users/${id}`);
  }

  // ----- Catálogo de tipos de documento + plantillas -----
  listDocumentTypes(): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.base}/document-types`);
  }
  uploadDocumentTemplate(itemKey: string, file: File) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ file_id: string }>(
      `${this.base}/document-templates/${itemKey}`,
      fd
    );
  }
  documentTemplateUrl(itemKey: string) {
    return `${this.base}/public/document-templates/${itemKey}`;
  }

  // ----- Manual de funciones por cargo -----
  getRoleManual(vacancyId: string): Observable<RoleManual> {
    return this.http.get<RoleManual>(`${this.base}/vacancies/${vacancyId}/role-manual`);
  }
  patchRoleManual(vacancyId: string, body: string, file?: File) {
    if (file) {
      const fd = new FormData();
      fd.append('body', body);
      fd.append('file', file);
      return this.http.patch(`${this.base}/vacancies/${vacancyId}/role-manual`, fd);
    }
    return this.http.patch(`${this.base}/vacancies/${vacancyId}/role-manual`, { body });
  }

  // ----- Cronograma funcional -----
  listFunctionalActivities(applicationId: string): Observable<FunctionalActivity[]> {
    return this.http.get<FunctionalActivity[]>(
      `${this.base}/applications/${applicationId}/functional/activities`
    );
  }
  listFunctionalActivityTemplates(vacancyId: string): Observable<FunctionalActivity[]> {
    return this.http.get<FunctionalActivity[]>(
      `${this.base}/vacancies/${vacancyId}/functional-activities`
    );
  }
  createFunctionalActivityTemplate(
    vacancyId: string,
    body: {
      phase: 'theory' | 'practice';
      sort_order?: number;
      title: string;
      description?: string;
      evidence_required?: boolean;
    }
  ) {
    return this.http.post<{ id: string }>(
      `${this.base}/vacancies/${vacancyId}/functional-activities`,
      body
    );
  }
  patchFunctionalActivityTemplate(tid: string, body: Record<string, unknown>) {
    return this.http.patch(`${this.base}/functional-activity-templates/${tid}`, body);
  }
  deleteFunctionalActivityTemplate(tid: string) {
    return this.http.delete(`${this.base}/functional-activity-templates/${tid}`);
  }
  completeFunctionalActivity(applicationId: string, activityId: string, notes: string, files?: File[]) {
    if (files?.length) {
      const fd = new FormData();
      fd.append('notes', notes);
      files.forEach((f) => fd.append('files', f));
      return this.http.post(
        `${this.base}/applications/${applicationId}/functional/activities/${activityId}/complete`,
        fd
      );
    }
    return this.http.post(
      `${this.base}/applications/${applicationId}/functional/activities/${activityId}/complete`,
      { notes }
    );
  }

  // ----- Decisión de hiring -----
  hiringDecision(applicationId: string, decision: 'hire' | 'reject', reason_id?: number, notes?: string) {
    return this.http.post<{ status: string; invitation_token?: string }>(
      `${this.base}/applications/${applicationId}/hiring-decision`,
      { decision, reason_id: reason_id ?? null, notes: notes ?? '' }
    );
  }

  // ----- Invitar al portal del worker -----
  inviteApplicationToPortal(applicationId: string) {
    return this.http.post<{ invitation_token: string }>(
      `${this.base}/applications/${applicationId}/invite`,
      {}
    );
  }

  // ----- Dotación / EPP -----
  recordEndowmentDelivery(
    applicationId: string,
    kind: 'epp' | 'dotacion',
    items: unknown[],
    signature?: File
  ) {
    if (signature) {
      const fd = new FormData();
      fd.append('kind', kind);
      fd.append('items', JSON.stringify(items));
      fd.append('signature', signature);
      return this.http.post(`${this.base}/applications/${applicationId}/endowment-delivery`, fd);
    }
    return this.http.post(`${this.base}/applications/${applicationId}/endowment-delivery`, {
      kind,
      items,
    });
  }
  listEndowmentDeliveries(applicationId: string): Observable<EndowmentDelivery[]> {
    return this.http.get<EndowmentDelivery[]>(
      `${this.base}/applications/${applicationId}/endowment-deliveries`
    );
  }

  // ----- Outbox / Notificaciones -----
  listOutbox(filters: { status?: string; channel?: string } = {}): Observable<OutboxMessage[]> {
    const params: Record<string, string> = {};
    if (filters.status) params['status'] = filters.status;
    if (filters.channel) params['channel'] = filters.channel;
    return this.http.get<OutboxMessage[]>(`${this.base}/admin/outbox`, { params });
  }
  retryOutbox(id: string) {
    return this.http.post(`${this.base}/admin/outbox/${id}/retry`, {});
  }

  // ----- SLA / atrasados -----
  listOverdueApplications(): Observable<OverdueApplication[]> {
    return this.http.get<OverdueApplication[]>(`${this.base}/applications/overdue`);
  }

  // ----- Reportes ampliados -----
  reportPipelineTimeUrl(): string {
    return `${this.base}/reports/pipeline-time.csv`;
  }
  reportIPSMonthlyUrl(): string {
    return `${this.base}/reports/ips-monthly.csv`;
  }
  reportOnboardingCompletedUrl(from?: string, to?: string): string {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const tail = qs.toString() ? `?${qs.toString()}` : '';
    return `${this.base}/reports/onboarding-completed.csv${tail}`;
  }
  reportApplicationsUrl(): string {
    return `${this.base}/reports/applications.csv`;
  }
}
