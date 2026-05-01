import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { WorkerApiService } from '../../core/worker-api.service';

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-page">
      <header class="brand-header">
        <div class="brand-header__inner">
          <div class="brand-header__logo" aria-hidden="true">H</div>
          <div>
            <p class="brand-header__name">Activa tu portal · HASES</p>
            <p class="brand-header__tagline">Define tu contraseña con el código que recibiste</p>
          </div>
        </div>
      </header>

      <div class="auth-page__main">
        <div class="auth-card">
          <aside class="auth-card__panel" aria-hidden="true">
            <span class="auth-card__badge">
              <span class="icon icon--filled icon--sm">verified</span>
              Activación segura
            </span>

            <blockquote class="auth-card__quote">
              <p>
                "Crea tu acceso al portal del trabajador en menos de un minuto.
                Tu información queda protegida y solo es visible para ti y RR.HH."
              </p>
              <footer>Equipo de gestión humana</footer>
            </blockquote>
          </aside>

          <div class="auth-card__form">
            <div class="auth-card__brand">
              <div class="brand-header__logo" aria-hidden="true">H</div>
              <div>
                <div class="auth-card__brand-name">Activar mi portal</div>
                <div class="auth-card__brand-tag">HASES Ingeniería</div>
              </div>
            </div>

            <h1 class="auth-card__title">Aceptar invitación</h1>
            <p class="auth-card__lead">
              Ingresa el código que aparece en tu correo de invitación y elige
              tu nueva contraseña.
            </p>

            <form (ngSubmit)="submit()">
              <div class="auth-card__field">
                <label for="tok">Código de invitación</label>
                <input
                  id="tok"
                  name="token"
                  [(ngModel)]="token"
                  placeholder="código recibido por correo"
                  required
                />
              </div>

              <div class="auth-card__field">
                <label for="np">Nueva contraseña</label>
                <input
                  id="np"
                  name="pass"
                  [(ngModel)]="password"
                  type="password"
                  minlength="6"
                  autocomplete="new-password"
                  placeholder="al menos 6 caracteres"
                  required
                />
              </div>

              <div class="auth-card__field">
                <label for="np2">Repetir contraseña</label>
                <input
                  id="np2"
                  name="pass2"
                  [(ngModel)]="password2"
                  type="password"
                  minlength="6"
                  autocomplete="new-password"
                  placeholder="repítela para confirmar"
                  required
                />
              </div>

              <button class="auth-card__submit" type="submit" [disabled]="loading">
                <span>{{ loading ? 'Activando…' : 'Activar mi cuenta' }}</span>
                <span class="icon icon--sm" *ngIf="!loading">check_circle</span>
              </button>

              <p class="auth-card__error" *ngIf="error">{{ error }}</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AcceptInvitationComponent implements OnInit {
  private readonly api = inject(WorkerApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  token = '';
  password = '';
  password2 = '';
  error = '';
  loading = false;

  ngOnInit(): void {
    const t = this.route.snapshot.queryParamMap.get('token');
    if (t) this.token = t;
  }

  async submit(): Promise<void> {
    this.error = '';
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.password !== this.password2) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.loading = true;
    try {
      const res = await firstValueFrom(this.api.acceptInvitation(this.token, this.password));
      localStorage.setItem('hases_jwt', res.token);
      await firstValueFrom(this.auth.refreshMe());
      this.router.navigateByUrl('/portal/inicio');
    } catch {
      this.error = 'Código inválido o vencido. Solicita uno nuevo a RR.HH.';
      this.loading = false;
    }
  }
}
