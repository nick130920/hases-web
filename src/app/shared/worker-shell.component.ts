import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-worker-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="worker-shell">
      <header class="brand-header">
        <div class="brand-header__inner">
          <div class="brand-header__logo" aria-hidden="true">H</div>
          <div style="flex:1; min-width:0;">
            <p class="brand-header__name">Portal del trabajador</p>
            <p class="brand-header__tagline">HASES · Tu ingreso paso a paso</p>
          </div>
          <button
            *ngIf="auth.user()"
            class="shell-topbar__logout"
            type="button"
            (click)="logout()"
          >
            <span class="icon icon--sm">logout</span>
            Salir
          </button>
        </div>
      </header>

      <main class="worker-shell__main">
        <router-outlet />
      </main>

      <nav class="worker-shell__nav" aria-label="Navegación del portal">
        <a routerLink="/portal/inicio" routerLinkActive="is-active">
          <span class="icon">home</span>
          Inicio
        </a>
        <a routerLink="/portal/documentos" routerLinkActive="is-active">
          <span class="icon">folder_shared</span>
          Documentos
        </a>
        <a routerLink="/portal/induccion" routerLinkActive="is-active">
          <span class="icon">school</span>
          Inducción
        </a>
        <a routerLink="/portal/funcional" routerLinkActive="is-active">
          <span class="icon">construction</span>
          Funcional
        </a>
      </nav>
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
