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
    <header class="brand-header">
      <div class="brand-header__inner">
        <p class="brand-header__name">HASES Ingeniería</p>
        <p class="brand-header__tagline">
          Aseo · Jardinería · Piscinas · Apoyo operativo · Sostenibilidad
        </p>
      </div>
    </header>
    <div class="login-page">
      <div class="login-card">
        <h1 class="login-card__title">Ingreso</h1>
        <p class="login-card__lead">Acceso al sistema interno de RR.HH.</p>
        <form (ngSubmit)="submit()">
          <label for="login-email">Correo electrónico</label>
          <input
            id="login-email"
            name="email"
            [(ngModel)]="email"
            type="email"
            autocomplete="username"
            required
          />
          <label for="login-password">Contraseña</label>
          <input
            id="login-password"
            name="password"
            [(ngModel)]="password"
            type="password"
            autocomplete="current-password"
            required
          />
          <button type="submit" [disabled]="loading">
            {{ loading ? 'Ingresando…' : 'Entrar' }}
          </button>
          <p class="login-card__error" *ngIf="error">{{ error }}</p>
        </form>
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
