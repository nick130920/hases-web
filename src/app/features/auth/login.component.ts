import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-page">
      <header class="brand-header">
        <div class="brand-header__inner">
          <div class="brand-header__logo" aria-hidden="true">H</div>
          <div>
            <p class="brand-header__name">HASES Ingeniería</p>
            <p class="brand-header__tagline">
              Aseo · Jardinería · Piscinas · Apoyo operativo · Sostenibilidad
            </p>
          </div>
        </div>
      </header>

      <div class="auth-page__main">
        <div class="auth-card">
          <aside class="auth-card__panel" aria-hidden="true">
            <span class="auth-card__badge">
              <span class="icon icon--filled icon--sm">eco</span>
              Operación en verde
            </span>

            <blockquote class="auth-card__quote">
              <p>
                "Liderando la eficiencia operativa con un compromiso inquebrantable
                por la sostenibilidad y la confianza técnica."
              </p>
              <footer>Gestión humana · Neiva, Huila</footer>
            </blockquote>
          </aside>

          <div class="auth-card__form">
            <div class="auth-card__brand">
              <div class="brand-header__logo" aria-hidden="true">H</div>
              <div>
                <div class="auth-card__brand-name">HASES Ingeniería</div>
                <div class="auth-card__brand-tag">RR.HH. · Backoffice</div>
              </div>
            </div>

            <h1 class="auth-card__title">Ingreso al sistema</h1>
            <p class="auth-card__lead">
              Acceso interno para el equipo de gestión humana y administración.
            </p>

            <form (ngSubmit)="submit()">
              <div class="auth-card__field">
                <label for="login-email">Correo electrónico</label>
                <input
                  id="login-email"
                  name="email"
                  [(ngModel)]="email"
                  type="email"
                  autocomplete="username"
                  placeholder="usuario@hases.com"
                  required
                />
              </div>

              <div class="auth-card__field">
                <label for="login-password">Contraseña</label>
                <input
                  id="login-password"
                  name="password"
                  [(ngModel)]="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button class="auth-card__submit" type="submit" [disabled]="loading">
                <span>{{ loading ? 'Ingresando…' : 'Ingresar al sistema' }}</span>
                <span class="icon icon--sm" *ngIf="!loading">login</span>
              </button>

              <p class="auth-card__error" *ngIf="error">{{ error }}</p>
            </form>

            <p class="auth-card__legal">
              HASES Ingeniería © {{ year }} · Protección de datos personales
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  error = '';
  loading = false;
  readonly year = new Date().getFullYear();

  submit(): void {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
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
