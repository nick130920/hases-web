import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="brand-header">
      <div class="brand-header__inner shell-topbar">
        <div>
          <p class="brand-header__name">HASES Ingeniería</p>
          <p class="brand-header__tagline">Gestión del ciclo de vida del trabajador</p>
        </div>
        <div class="shell-topbar__user" *ngIf="auth.user() as u">
          <span class="shell-topbar__user-email">{{ u.email }}</span>
          <span class="shell-topbar__user-role">{{ u.role }}</span>
          <button class="shell-topbar__logout" type="button" (click)="logout()">Salir</button>
        </div>
      </div>
    </header>

    <div class="shell-layout">
      <nav class="shell-side">
        <a routerLink="/dashboard" routerLinkActive="is-active">Tablero</a>
        <a routerLink="/vacancies" routerLinkActive="is-active">Vacantes</a>
        <a routerLink="/applications" routerLinkActive="is-active">Postulaciones</a>
        <a routerLink="/interviews" routerLinkActive="is-active">Entrevistas</a>
        <a routerLink="/induction" routerLinkActive="is-active">Inducción</a>
        <a routerLink="/reports" routerLinkActive="is-active">Reportes</a>
        <ng-container *ngIf="auth.hasRole('admin')">
          <a routerLink="/admin/users" routerLinkActive="is-active">Usuarios</a>
          <a routerLink="/admin/catalog" routerLinkActive="is-active">Catálogos</a>
          <a routerLink="/admin/outbox" routerLinkActive="is-active">Notificaciones</a>
        </ng-container>
      </nav>

      <main class="shell-main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
