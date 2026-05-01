import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { User } from '../../core/types';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Usuarios</h1>
        <p class="page-subtitle">Crea y administra accesos al sistema (solo admin).</p>
      </header>

      <form class="card form-grid" (ngSubmit)="create()">
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
        <div class="form-actions">
          <button class="btn btn--primary" type="submit">Crear usuario</button>
        </div>
        <p class="error" *ngIf="error">{{ error }}</p>
      </form>

      <table class="data-table">
        <thead>
          <tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let u of users()">
            <td>{{ u.email }}</td>
            <td>{{ u.full_name }}</td>
            <td><span class="badge">{{ u.role }}</span></td>
            <td>{{ u.active ? 'Activo' : 'Inactivo' }}</td>
            <td class="data-table__actions">
              <button class="btn btn--ghost" (click)="toggle(u)">
                {{ u.active ? 'Desactivar' : 'Reactivar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  `,
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  users = signal<User[]>([]);
  form = { email: '', password: '', full_name: '', role: 'hr' };
  error = '';

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
