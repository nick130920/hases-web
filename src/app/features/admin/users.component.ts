import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Role, User } from '../../core/types';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  hr: 'RR.HH.',
  evaluator: 'Evaluador',
  hiring_manager: 'Hiring manager',
  worker: 'Trabajador',
};

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Usuarios</h1>
        <p class="page-subtitle">
          Crea y administra accesos al sistema. Solo el rol <code>admin</code>
          puede gestionar esta sección.
        </p>
      </header>

      <form class="card card--accent form-grid" (ngSubmit)="create()">
        <h2 class="form-grid__full" style="margin:0;">Nuevo usuario</h2>
        <label>
          Email
          <input type="email" [(ngModel)]="form.email" name="email" required />
        </label>
        <label>
          Nombre completo
          <input [(ngModel)]="form.full_name" name="full_name" required />
        </label>
        <label>
          Rol
          <select [(ngModel)]="form.role" name="role">
            <option value="hr">RR.HH.</option>
            <option value="evaluator">Evaluador</option>
            <option value="hiring_manager">Hiring manager</option>
            <option value="admin">Admin</option>
            <option value="worker">Trabajador (portal)</option>
          </select>
        </label>
        <label>
          Contraseña
          <input type="password" [(ngModel)]="form.password" name="password" required />
        </label>
        <div class="form-actions form-grid__full">
          <button class="btn btn--primary" type="submit">
            <span class="icon icon--sm">person_add</span>
            Crear usuario
          </button>
        </div>
        <p class="error form-grid__full" *ngIf="error">{{ error }}</p>
      </form>

      <div class="card" *ngIf="users().length; else noUsers" style="padding:0; overflow:hidden;">
        <table class="data-table" style="border:none; box-shadow:none; border-radius:0;">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users()">
              <td>
                <div class="data-table__name">
                  <span class="avatar avatar--sm">{{ initials(u) }}</span>
                  <span>
                    {{ u.full_name || u.email }}
                    <small class="text-muted">{{ u.email }}</small>
                  </span>
                </div>
              </td>
              <td>
                <span class="badge badge--soft">{{ roleLabel(u.role) }}</span>
              </td>
              <td>
                <span class="badge" [class]="u.active ? 'badge badge--success' : 'badge badge--neutral'">
                  {{ u.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="data-table__actions" style="justify-content: flex-end;">
                <button
                  class="btn btn--ghost"
                  [class.btn--danger]="u.active"
                  (click)="toggle(u)"
                >
                  <span class="icon icon--sm">{{ u.active ? 'block' : 'restart_alt' }}</span>
                  {{ u.active ? 'Desactivar' : 'Reactivar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #noUsers>
        <p class="empty">Aún no hay usuarios. Crea el primero arriba.</p>
      </ng-template>
    </section>
  `,
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  users = signal<User[]>([]);
  form = { email: '', password: '', full_name: '', role: 'hr' };
  error = '';

  initials(u: User): string {
    const name = u.full_name?.trim() || u.email;
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
    return (first + second).toUpperCase() || '?';
  }

  roleLabel(r: Role): string {
    return ROLE_LABEL[r] ?? r;
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listUsers().subscribe({ next: (u) => this.users.set(u ?? []) });
  }

  create(): void {
    this.error = '';
    this.api.createUser(this.form).subscribe({
      next: () => {
        this.form = { email: '', password: '', full_name: '', role: 'hr' };
        this.refresh();
      },
      error: (e) => (this.error = e?.error?.error ?? 'Error al crear'),
    });
  }

  toggle(u: User): void {
    if (u.active) {
      this.api.deactivateUser(u.id).subscribe({ next: () => this.refresh() });
    } else {
      this.api.patchUser(u.id, { active: true }).subscribe({ next: () => this.refresh() });
    }
  }
}
