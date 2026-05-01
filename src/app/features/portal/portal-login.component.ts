import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-portal-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <header class="brand-header">
      <div class="brand-header__inner">
        <p class="brand-header__name">Portal del trabajador · HASES</p>
        <p class="brand-header__tagline">Continúa tu proceso de ingreso</p>
      </div>
    </header>
    <div class="login-page">
      <div class="login-card">
        <h1 class="login-card__title">Ingreso al portal</h1>
        <p class="login-card__lead">Accede con tu correo y la contraseña que definiste.</p>
        <form (ngSubmit)="submit()">
          <label for="we">Correo</label>
          <input id="we" name="email" [(ngModel)]="email" type="email" autocomplete="username" required />
          <label for="wp">Contraseña</label>
          <input id="wp" name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required />
          <button type="submit" [disabled]="loading">
            {{ loading ? 'Ingresando…' : 'Entrar' }}
          </button>
          <p class="login-card__error" *ngIf="error">{{ error }}</p>
        </form>
        <p class="login-card__footer-nav">
          ¿Recibiste un código de invitación?
          <a routerLink="/portal/aceptar-invitacion">Activar mi cuenta</a>
        </p>
      </div>
    </div>
  `,
})
export class PortalLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  error = '';
  loading = false;

  submit(): void {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/portal/inicio';
        this.router.navigateByUrl(returnUrl).finally(() => (this.loading = false));
      },
      error: (err) => {
        this.error =
          err?.status === 401 || err?.status === 403
            ? 'Credenciales inválidas'
            : 'No se pudo iniciar sesión. Intenta de nuevo.';
        this.loading = false;
      },
    });
  }
}
