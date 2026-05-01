import { Routes } from '@angular/router';
import { authGuard, roleGuard, workerGuard } from './core/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { ShellComponent } from './shared/shell.component';
import { WorkerShellComponent } from './shared/worker-shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  // Portal del trabajador (rol `worker`).
  {
    path: 'portal/login',
    loadComponent: () =>
      import('./features/portal/portal-login.component').then((m) => m.PortalLoginComponent),
  },
  {
    path: 'portal/aceptar-invitacion',
    loadComponent: () =>
      import('./features/portal/accept-invitation.component').then(
        (m) => m.AcceptInvitationComponent
      ),
  },
  {
    path: 'portal',
    component: WorkerShellComponent,
    canActivate: [workerGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/portal/portal-home.component').then((m) => m.PortalHomeComponent),
      },
      {
        path: 'documentos',
        loadComponent: () =>
          import('./features/portal/portal-documents.component').then(
            (m) => m.PortalDocumentsComponent
          ),
      },
      {
        path: 'induccion',
        loadComponent: () =>
          import('./features/portal/portal-induction.component').then(
            (m) => m.PortalInductionComponent
          ),
      },
      {
        path: 'funcional',
        loadComponent: () =>
          import('./features/portal/portal-functional.component').then(
            (m) => m.PortalFunctionalComponent
          ),
      },
    ],
  },

  // Backoffice de RR.HH.
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'vacancies',
        loadComponent: () =>
          import('./features/vacancies/vacancies.component').then((m) => m.VacanciesComponent),
      },
      {
        path: 'applications',
        loadComponent: () =>
          import('./features/applications/applications-list.component').then(
            (m) => m.ApplicationsListComponent
          ),
      },
      {
        path: 'applications/:id',
        loadComponent: () =>
          import('./features/applications/application-detail.component').then(
            (m) => m.ApplicationDetailComponent
          ),
      },
      {
        path: 'interviews',
        loadComponent: () =>
          import('./features/interviews/interviews.component').then((m) => m.InterviewsComponent),
      },
      {
        path: 'induction',
        loadComponent: () =>
          import('./features/induction/induction.component').then((m) => m.InductionComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'admin/catalog',
        canActivate: [roleGuard('admin', 'hr')],
        loadComponent: () =>
          import('./features/admin/catalog.component').then((m) => m.CatalogComponent),
      },
      {
        path: 'admin/outbox',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/admin/outbox.component').then((m) => m.OutboxComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
