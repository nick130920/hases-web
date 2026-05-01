import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-worker-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="brand-header">
      <div class="brand-header__inner shell-topbar">
        <div>
          <p class="brand-header__name">Portal del trabajador · HASES</p>
          <p class="brand-header__tagline">Tu proceso de ingreso paso a paso</p>
        </div>
        <div class="shell-topbar__user" *ngIf="auth.user() as u">
          <span class="shell-topbar__user-email">{{ u.email }}</span>
          <button class="shell-topbar__logout" type="button" (click)="logout()">Salir</button>
        </div>
      </div>
    </header>

    <div class="shell-layout">
      <nav class="shell-side">
        <a routerLink="/portal/inicio" routerLinkActive="is-active">Inicio</a>
        <a routerLink="/portal/documentos" routerLinkActive="is-active">Documentos</a>
        <a routerLink="/portal/induccion" routerLinkActive="is-active">Inducción</a>
        <a routerLink="/portal/funcional" routerLinkActive="is-active">Plan funcional</a>
      </nav>

      <main class="shell-main">
        <router-outlet />
      </main>
    </div>
  `,
})
export class WorkerShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/portal/login');
  }
}
