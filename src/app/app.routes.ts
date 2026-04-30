import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { ShellComponent } from './shared/shell.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
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
    ],
  },
  { path: '**', redirectTo: '' },
];
