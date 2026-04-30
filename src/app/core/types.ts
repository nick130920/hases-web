export type Role = 'admin' | 'hr' | 'evaluator' | 'hiring_manager';

export interface MeResponse {
  user_id: string;
  email: string;
  role: Role;
}

export interface Vacancy {
  id: string;
  title: string;
  description: string;
  requirements: string;
  status: 'draft' | 'published' | 'closed';
  public_slug: string;
  published_at: string;
  checklist_template_id: string;
  created_at: string;
}

export interface ApplicationListItem {
  id: string;
  vacancy_id: string;
  status: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  channel: string;
  created_at: string;
}

export interface Completeness {
  total: number;
  with_file: number;
  approved: number;
  rejected: number;
  pending: number;
  required_total: number;
  required_satisfied: number;
  complete: boolean;
}

export interface ApplicationDocument {
  id: string;
  checklist_item_id: string;
  item_key: string;
  label: string;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewer_notes: string;
  file_id?: string;
  required: boolean;
}

export interface ApplicationDetail extends ApplicationListItem {
  cv_reference: string;
  requires_vehicle: boolean;
  discarded_reason: string;
  notes: string;
  documents: ApplicationDocument[];
  completeness: Completeness;
}

export interface InterviewSession {
  id: string;
  application_id: string;
  template_id: string;
  scheduled_at: string;
  location: string;
  modality: string;
  interviewer_notes: string;
  created_at: string;
}

export interface InductionOrgModule {
  id: string;
  title: string;
  body: string;
  sort_order: number;
}

export interface RejectionReason {
  id: number;
  label: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  active: boolean;
  created_at: string;
}

export const PIPELINE_STATUSES: { value: string; label: string }[] = [
  { value: 'applied', label: 'Postuló' },
  { value: 'docs_pending', label: 'Documentos pendientes' },
  { value: 'docs_incomplete', label: 'Documentos incompletos' },
  { value: 'docs_review', label: 'En revisión documental' },
  { value: 'docs_approved', label: 'Documentos aprobados' },
  { value: 'interview_pending', label: 'Entrevista pendiente' },
  { value: 'interview_done', label: 'Entrevista realizada' },
  { value: 'occ_pending', label: 'Examen ocupacional pendiente' },
  { value: 'occ_sent', label: 'Examen enviado a IPS' },
  { value: 'occ_result_received', label: 'Resultado IPS recibido' },
  { value: 'hiring_pending', label: 'Contratación pendiente' },
  { value: 'hired', label: 'Contratado' },
  { value: 'rejected', label: 'Descartado' },
  { value: 'induction_org', label: 'Inducción organizacional' },
  { value: 'induction_org_done', label: 'Inducción organizacional cerrada' },
  { value: 'induction_theory', label: 'Inducción teórica' },
  { value: 'induction_epp_pending', label: 'EPP pendiente de entrega' },
  { value: 'induction_practice', label: 'Inducción práctica' },
  { value: 'onboarding_complete', label: 'Onboarding completo' },
];

export function statusLabel(value: string): string {
  return PIPELINE_STATUSES.find((s) => s.value === value)?.label ?? value;
}
