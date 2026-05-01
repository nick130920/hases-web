import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApplicationDetail,
  FunctionalActivity,
  InductionOrgModuleEnriched,
} from './types';

export interface WorkerFunctionalPlan {
  role_manual_body: string;
  role_manual_file_id?: string;
  manual_summary: string;
  theory_completed_at: string;
  practice_started_at: string;
  practice_completed_at: string;
  onboarding_completed_at: string;
}

@Injectable({ providedIn: 'root' })
export class WorkerApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  acceptInvitation(token: string, password: string) {
    return this.http.post<{ token: string; expires_in_hours: number }>(
      `${this.base}/auth/accept-invitation`,
      { token, password }
    );
  }

  getApplication(): Observable<ApplicationDetail> {
    return this.http.get<ApplicationDetail>(`${this.base}/me/application`);
  }

  uploadDocument(itemId: string, file: File, issuedAt?: string) {
    const fd = new FormData();
    fd.append('file', file);
    if (issuedAt) fd.append('issued_at', issuedAt);
    return this.http.post<{ file_id: string }>(
      `${this.base}/me/application/documents/${itemId}/upload`,
      fd
    );
  }

  listInductionModules(): Observable<InductionOrgModuleEnriched[]> {
    return this.http.get<InductionOrgModuleEnriched[]>(`${this.base}/me/induction/org-modules`);
  }

  markProgress(moduleId: string) {
    return this.http.post(`${this.base}/me/induction/org-progress`, { module_id: moduleId });
  }

  reportProgress(moduleId: string, viewedSeconds: number, markComplete = false) {
    return this.http.patch(`${this.base}/me/induction/progress/${moduleId}`, {
      viewed_seconds: viewedSeconds,
      mark_complete: markComplete,
    });
  }

  uploadSignatureFile(kind: string, file: File) {
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('file', file);
    return this.http.post(`${this.base}/me/induction/signatures`, fd);
  }

  uploadSignatureBase64(kind: string, dataURI: string) {
    return this.http.post(`${this.base}/me/induction/signatures`, { kind, signature_data: dataURI });
  }

  getFunctionalPlan(): Observable<WorkerFunctionalPlan> {
    return this.http.get<WorkerFunctionalPlan>(`${this.base}/me/functional-plan`);
  }

  listFunctionalActivities(): Observable<FunctionalActivity[]> {
    return this.http.get<FunctionalActivity[]>(`${this.base}/me/functional/activities`);
  }

  completeFunctionalActivity(activityId: string, notes: string, files?: File[]) {
    if (files?.length) {
      const fd = new FormData();
      fd.append('notes', notes);
      files.forEach((f) => fd.append('files', f));
      return this.http.post(`${this.base}/me/functional/activities/${activityId}/complete`, fd);
    }
    return this.http.post(`${this.base}/me/functional/activities/${activityId}/complete`, { notes });
  }

  addEvidence(phase: 'theory' | 'practice', notes: string, files: File[]) {
    const fd = new FormData();
    fd.append('phase', phase);
    fd.append('notes', notes);
    fd.append('actor', 'worker');
    files.forEach((f) => fd.append('files', f));
    return this.http.post(`${this.base}/me/functional/evidence`, fd);
  }

  fileUrl(fid: string): string {
    return `${this.base}/files/${fid}`;
  }
}
