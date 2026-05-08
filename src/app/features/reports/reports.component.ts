import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import {
  OverdueApplication,
  statusBadgeClass,
  statusLabel,
} from '../../core/types';

/**
 * Identificadores de los reportes descargables. Sirven como llave para el
 * mapa de "descargas en curso" y para mostrar el spinner solo en la card
 * que el usuario pulsó.
 */
type ReportKey =
  | 'applications'
  | 'pipeline-time'
  | 'ips-monthly'
  | 'onboarding-completed';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Reportes</h1>
        <p class="page-subtitle">
          Descarga reportes en Excel y revisa los casos que están demorando
          más de lo permitido.
        </p>
      </header>

      <div class="kpi-grid">
        <button
          type="button"
          class="kpi-card"
          [disabled]="busy('applications')"
          (click)="download('applications', api.reportApplications(), 'postulaciones.csv')"
        >
          <span class="kpi-card__icon">
            <span class="icon">{{ busy('applications') ? 'progress_activity' : 'groups' }}</span>
          </span>
          <span class="kpi-card__label">Postulaciones</span>
          <span class="kpi-card__value">{{ busy('applications') ? 'Descargando…' : 'Excel' }}</span>
          <span class="kpi-card__hint">Lista completa de candidatos</span>
        </button>
        <button
          type="button"
          class="kpi-card"
          [disabled]="busy('pipeline-time')"
          (click)="download('pipeline-time', api.reportPipelineTime(), 'duracion-por-etapa.csv')"
        >
          <span class="kpi-card__icon">
            <span class="icon">{{ busy('pipeline-time') ? 'progress_activity' : 'schedule' }}</span>
          </span>
          <span class="kpi-card__label">Duración por etapa</span>
          <span class="kpi-card__value">{{ busy('pipeline-time') ? 'Descargando…' : 'Excel' }}</span>
          <span class="kpi-card__hint">Cuánto tarda cada fase del proceso</span>
        </button>
        <button
          type="button"
          class="kpi-card kpi-card--soft"
          [disabled]="busy('ips-monthly')"
          (click)="download('ips-monthly', api.reportIPSMonthly(), 'examenes-medicos.csv')"
        >
          <span class="kpi-card__icon">
            <span class="icon">{{ busy('ips-monthly') ? 'progress_activity' : 'medical_services' }}</span>
          </span>
          <span class="kpi-card__label">Exámenes médicos del mes</span>
          <span class="kpi-card__value">{{ busy('ips-monthly') ? 'Descargando…' : 'Excel' }}</span>
          <span class="kpi-card__hint">Resultados de la IPS</span>
        </button>
      </div>

      <article class="card card--accent">
        <div class="card-section-head">
          <h2>Onboarding completados</h2>
          <span class="badge badge--soft">por fechas</span>
        </div>
        <form class="filters" style="margin-bottom: 0;" (ngSubmit)="downloadOnboarding()">
          <label>
            Desde
            <input type="date" [(ngModel)]="from" name="from" />
          </label>
          <label>
            Hasta
            <input type="date" [(ngModel)]="to" name="to" />
          </label>
          <button class="btn btn--primary" type="submit" [disabled]="busy('onboarding-completed')">
            <span class="icon icon--sm">{{ busy('onboarding-completed') ? 'progress_activity' : 'download' }}</span>
            {{ busy('onboarding-completed') ? 'Descargando…' : 'Descargar Excel' }}
          </button>
        </form>
      </article>

      <article class="card card--accent-soft">
        <div class="card-section-head">
          <h2>Postulaciones que están demorando</h2>
          <span class="badge" [class.badge--error]="overdue().length" [class.badge--success]="!overdue().length">
            {{ overdue().length || 'Sin atrasos' }}{{ overdue().length ? ' atrasadas' : '' }}
          </span>
        </div>
        <p class="page-subtitle">
          Cada etapa del proceso tiene un plazo máximo. Aquí ves los casos
          que ya superaron ese tiempo y necesitan atención.
        </p>
        <table class="data-table" *ngIf="overdue().length; else noOverdue">
          <thead>
            <tr>
              <th>Postulante</th>
              <th>Etapa actual</th>
              <th>Días en esta etapa</th>
              <th>Plazo máximo</th>
              <th>Atraso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let o of overdue()">
              <td>
                <div class="data-table__name">
                  <span class="avatar avatar--sm">{{ initials(o) }}</span>
                  <span>{{ o.first_name }} {{ o.last_name }}</span>
                </div>
              </td>
              <td>
                <span class="badge" [class]="'badge ' + badgeClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </td>
              <td>{{ o.days_in_state }}</td>
              <td>{{ o.sla_max_days }}</td>
              <td>
                <span class="text-error">+{{ o.overdue_by }} día(s)</span>
              </td>
              <td>
                <a [routerLink]="['/applications', o.id]" class="row" style="justify-content:flex-end;">
                  Abrir <span class="icon icon--sm">arrow_forward</span>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #noOverdue>
          <p class="empty">Sin postulaciones atrasadas. Operación al día.</p>
        </ng-template>
      </article>
    </section>
  `,
})
export class ReportsComponent implements OnInit {
  protected readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  overdue = signal<OverdueApplication[]>([]);
  from = '';
  to = '';
  statusLabel = statusLabel;
  badgeClass = statusBadgeClass;

  /**
   * Descargas en curso. Se mantienen en una signal para que el botón
   * correspondiente muestre estado de carga sin afectar a las demás cards.
   */
  private readonly downloading = signal<Set<ReportKey>>(new Set());

  initials(o: OverdueApplication): string {
    const f = (o.first_name?.[0] ?? '').toUpperCase();
    const l = (o.last_name?.[0] ?? '').toUpperCase();
    return (f + l) || '?';
  }

  ngOnInit(): void {
    this.api.listOverdueApplications().subscribe({ next: (o) => this.overdue.set(o ?? []) });
  }

  busy(key: ReportKey): boolean {
    return this.downloading().has(key);
  }

  /**
   * Lanza la descarga autenticada de un reporte y dispara el guardado del
   * archivo en el navegador. El `fallbackName` se usa si el backend no
   * adjunta `Content-Disposition`.
   */
  download(
    key: ReportKey,
    request$: Observable<HttpResponse<Blob>>,
    fallbackName: string,
  ): void {
    if (this.busy(key)) return;
    this.markBusy(key, true);
    request$.subscribe({
      next: (res) => {
        const filename = filenameFromResponse(res, fallbackName);
        const blob = res.body ?? new Blob([], { type: 'text/csv' });
        triggerBlobDownload(blob, filename);
        this.markBusy(key, false);
      },
      error: (err: unknown) => {
        this.markBusy(key, false);
        this.toast.error(humanizeDownloadError(err));
      },
    });
  }

  downloadOnboarding(): void {
    this.download(
      'onboarding-completed',
      this.api.reportOnboardingCompleted(this.from || undefined, this.to || undefined),
      'onboarding-completados.csv',
    );
  }

  private markBusy(key: ReportKey, busy: boolean): void {
    this.downloading.update((current) => {
      const next = new Set(current);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }
}

/**
 * Crea un enlace temporal a un blob y simula un clic para forzar la
 * descarga con el nombre indicado. El `URL.revokeObjectURL` libera la
 * memoria reservada por el navegador.
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Extrae el nombre de archivo del header `Content-Disposition`. Soporta
 * las variantes `filename="x.csv"` y `filename*=UTF-8''x.csv` (RFC 5987).
 * Si nada coincide se devuelve el `fallback` indicado por el llamador.
 */
function filenameFromResponse(
  res: HttpResponse<Blob>,
  fallback: string,
): string {
  const header = res.headers.get('Content-Disposition') ?? '';
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/(^"|"$)/g, ''));
    } catch {
      // si la decodificación falla, intentamos con el formato simple
    }
  }
  const simple = /filename="?([^";]+)"?/i.exec(header);
  if (simple?.[1]) return simple[1].trim();
  return fallback;
}

/**
 * Convierte un error HTTP en un mensaje claro para el usuario. Diferencia
 * los casos típicos (sin sesión, sin permisos, sin datos en el rango) del
 * fallback genérico.
 */
function humanizeDownloadError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) {
      return 'Tu sesión expiró. Vuelve a iniciar sesión para descargar el reporte.';
    }
    if (err.status === 403) {
      return 'No tienes permiso para descargar este reporte.';
    }
    if (err.status === 404) {
      return 'El reporte no está disponible en este momento.';
    }
  }
  return 'No se pudo descargar el reporte. Intenta de nuevo en unos segundos.';
}
