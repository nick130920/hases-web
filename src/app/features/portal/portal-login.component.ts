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
    <div class="auth-page">
      <header class="brand-header">
        <div class="brand-header__inner">
          <div class="brand-header__logo" aria-hidden="true">H</div>
          <div>
            <p class="brand-header__name">Portal del trabajador · HASES</p>
            <p class="brand-header__tagline">Continúa tu proceso de ingreso</p>
          </div>
        </div>
      </header>

      <div class="auth-page__main">
        <div class="auth-card">
          <aside class="auth-card__panel" aria-hidden="true">
            <span class="auth-card__badge">
              <span class="icon icon--filled icon--sm">badge</span>
              Tu portal personal
            </span>

            <blockquote class="auth-card__quote">
              <p>
                "Aquí cargas tus documentos, ves tu inducción y haces seguimiento
                a tu proceso de vinculación con HASES."
              </p>
              <footer>Tu ingreso, paso a paso</footer>
            </blockquote>
          </aside>

          <div class="auth-card__form">
            <div class="auth-card__brand">
              <div class="brand-header__logo" aria-hidden="true">H</div>
              <div>
                <div class="auth-card__brand-name">Portal del trabajador</div>
                <div class="auth-card__brand-tag">HASES Ingeniería</div>
              </div>
            </div>

            <h1 class="auth-card__title">Ingreso al portal</h1>
            <p class="auth-card__lead">
              Accede con tu correo y la contraseña que definiste al activar tu cuenta.
            </p>

            <form (ngSubmit)="submit()">
              <div class="auth-card__field">
                <label for="we">Correo electrónico</label>
                <input
                  id="we"
                  name="email"
                  [(ngModel)]="email"
                  type="email"
                  autocomplete="username"
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </div>

              <div class="auth-card__field">
                <label for="wp">Contraseña</label>
                <input
                  id="wp"
                  name="password"
                  [(ngModel)]="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button class="auth-card__submit" type="submit" [disabled]="loading">
                <span>{{ loading ? 'Ingresando…' : 'Entrar al portal' }}</span>
                <span class="icon icon--sm" *ngIf="!loading">login</span>
              </button>

              <p class="auth-card__error" *ngIf="error">{{ error }}</p>
            </form>

            <p class="auth-card__footer-nav">
              ¿Recibiste un código de invitación?
              <a routerLink="/portal/aceptar-invitacion">Activar mi cuenta</a>
            </p>
          </div>
        </div>
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
