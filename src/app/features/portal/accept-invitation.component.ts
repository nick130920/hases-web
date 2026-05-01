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
    <header class="brand-header">
      <div class="brand-header__inner">
        <p class="brand-header__name">Activa tu portal · HASES</p>
        <p class="brand-header__tagline">Define tu contraseña con el código que recibiste</p>
      </div>
    </header>
    <div class="login-page">
      <div class="login-card">
        <h1 class="login-card__title">Aceptar invitación</h1>
        <p class="login-card__lead">
          Ingresa el código que aparece en el correo de invitación y elige tu nueva contraseña.
        </p>
        <form (ngSubmit)="submit()">
          <label for="tok">Código de invitación</label>
          <input id="tok" name="token" [(ngModel)]="token" required />
          <label for="np">Nueva contraseña</label>
          <input
            id="np"
            name="pass"
            [(ngModel)]="password"
            type="password"
            minlength="6"
            autocomplete="new-password"
            required
          />
          <label for="np2">Repetir contraseña</label>
          <input
            id="np2"
            name="pass2"
            [(ngModel)]="password2"
            type="password"
            minlength="6"
            autocomplete="new-password"
            required
          />
          <button type="submit" [disabled]="loading">
            {{ loading ? 'Activando…' : 'Activar cuenta' }}
          </button>
          <p class="login-card__error" *ngIf="error">{{ error }}</p>
        </form>
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
