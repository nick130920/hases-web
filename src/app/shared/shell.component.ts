import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeToggleComponent } from './theme-toggle.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, ThemeToggleComponent],
  template: `
    <header class="shell-topbar">
      <div class="shell-topbar__brand">
        <div class="shell-topbar__logo" aria-hidden="true">H</div>
        <div class="shell-topbar__title">
          <strong>HASES Ingeniería</strong>
          <span>RR.HH. · Backoffice</span>
        </div>
      </div>

      <div class="shell-topbar__context">
        <span class="shell-topbar__context-divider"></span>
        <span class="shell-topbar__section">Gestión del talento operativo</span>
      </div>

      <div class="shell-topbar__user" *ngIf="auth.user() as u">
        <app-theme-toggle />
        <div class="shell-topbar__user-info">
          <span class="shell-topbar__user-email">{{ u.email }}</span>
          <span class="shell-topbar__user-role">{{ u.role }}</span>
        </div>
        <div class="shell-topbar__avatar" aria-hidden="true">{{ initials() }}</div>
        <button class="shell-topbar__logout" type="button" (click)="logout()">
          <span class="icon icon--sm">logout</span>
          Salir
        </button>
      </div>
    </header>

    <div class="shell-layout">
      <nav class="shell-side" aria-label="Navegación principal">
        <p class="shell-side__group">Operación</p>
        <a routerLink="/dashboard" routerLinkActive="is-active">
          <span class="icon">dashboard</span>
          Tablero
        </a>
        <a routerLink="/vacancies" routerLinkActive="is-active">
          <span class="icon">work</span>
          Vacantes
        </a>
        <a routerLink="/applications" routerLinkActive="is-active">
          <span class="icon">group</span>
          Postulaciones
        </a>
        <a routerLink="/interviews" routerLinkActive="is-active">
          <span class="icon">event</span>
          Entrevistas
        </a>

        <p class="shell-side__group">Inducción y formación</p>
        <a routerLink="/induction" routerLinkActive="is-active">
          <span class="icon">school</span>
          Inducción
        </a>
        <a routerLink="/reports" routerLinkActive="is-active">
          <span class="icon">analytics</span>
          Reportes
        </a>

        <ng-container *ngIf="auth.hasRole('admin') || auth.hasRole('hr')">
          <p class="shell-side__group">Administración</p>
          <a *ngIf="auth.hasRole('admin')" routerLink="/admin/users" routerLinkActive="is-active">
            <span class="icon">badge</span>
            Usuarios
          </a>
          <a routerLink="/admin/catalog" routerLinkActive="is-active">
            <span class="icon">tune</span>
            Catálogos
          </a>
          <a *ngIf="auth.hasRole('admin')" routerLink="/admin/outbox" routerLinkActive="is-active">
            <span class="icon">outgoing_mail</span>
            Notificaciones
          </a>
        </ng-container>

        <div class="shell-side__footer">HASES Ingeniería · Operación en Verde</div>
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

  readonly initials = computed(() => {
    const u = this.auth.user();
    if (!u?.email) return 'H';
    return u.email.slice(0, 2).toUpperCase();
  });

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
