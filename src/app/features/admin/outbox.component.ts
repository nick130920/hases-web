import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { OutboxMessage } from '../../core/types';

@Component({
  selector: 'app-outbox',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Cola de notificaciones</h1>
        <p class="page-subtitle">
          Mensajes encolados para envío por email/WhatsApp/SMS con reintento
          automático ante fallos transitorios.
        </p>
      </header>

      <div class="kpi-grid">
        <div class="kpi-card kpi-card--soft">
          <span class="kpi-card__icon"><span class="icon">pending</span></span>
          <span class="kpi-card__label">Pendientes</span>
          <span class="kpi-card__value">{{ counters().pending }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-card__icon"><span class="icon">mark_email_read</span></span>
          <span class="kpi-card__label">Enviados</span>
          <span class="kpi-card__value">{{ counters().sent }}</span>
        </div>
        <div class="kpi-card kpi-card--soft">
          <span class="kpi-card__icon"><span class="icon">error</span></span>
          <span class="kpi-card__label">Fallidos</span>
          <span class="kpi-card__value" style="color: var(--color-error);">
            {{ counters().failed }}
          </span>
        </div>
      </div>

      <form class="filters" (ngSubmit)="refresh()">
        <label>
          Estado
          <select [(ngModel)]="filters.status" name="st">
            <option value="">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="sent">Enviados</option>
            <option value="failed">Fallidos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </label>
        <label>
          Canal
          <select [(ngModel)]="filters.channel" name="ch">
            <option value="">Todos</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </label>
        <button class="btn btn--primary" type="submit">
          <span class="icon icon--sm">filter_alt</span>
          Filtrar
        </button>
      </form>

      <div class="card" *ngIf="items().length; else empty" style="padding:0; overflow:hidden;">
        <table class="data-table" style="border:none; box-shadow:none; border-radius:0;">
          <thead>
            <tr>
              <th>Canal</th>
              <th>Destino</th>
              <th>Asunto</th>
              <th>Estado</th>
              <th>Intentos</th>
              <th>Programado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let m of items()">
              <td>
                <span class="badge badge--soft">
                  <span class="icon icon--sm">{{ channelIcon(m.channel) }}</span>
                  {{ m.channel }}
                </span>
              </td>
              <td class="text-muted">{{ m.to }}</td>
              <td>{{ m.subject }}</td>
              <td>
                <span class="badge" [class]="'badge ' + statusBadge(m.status)">
                  {{ statusLabel(m.status) }}
                </span>
                <p class="muted" *ngIf="m.last_error">{{ m.last_error }}</p>
              </td>
              <td>{{ m.attempts }}</td>
              <td class="text-muted">{{ m.scheduled_for }}</td>
              <td class="text-right">
                <button
                  class="btn btn--ghost"
                  *ngIf="m.status === 'failed' || m.status === 'pending'"
                  (click)="retry(m)"
                >
                  <span class="icon icon--sm">refresh</span>
                  Re-encolar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #empty>
        <p class="empty">No hay mensajes con los filtros aplicados.</p>
      </ng-template>
    </section>
  `,
})
export class OutboxComponent implements OnInit {
  private readonly api = inject(ApiService);
  items = signal<OutboxMessage[]>([]);
  filters = { status: '', channel: '' };

  counters = computed(() => {
    const list = this.items();
    return {
      pending: list.filter((m) => m.status === 'pending').length,
      sent: list.filter((m) => m.status === 'sent').length,
      failed: list.filter((m) => m.status === 'failed').length,
    };
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listOutbox(this.filters).subscribe({ next: (m) => this.items.set(m ?? []) });
  }

  retry(m: OutboxMessage): void {
    this.api.retryOutbox(m.id).subscribe({ next: () => this.refresh() });
  }

  channelIcon(c: string): string {
    return c === 'email'
      ? 'mail'
      : c === 'whatsapp'
        ? 'chat'
        : c === 'sms'
          ? 'sms'
          : 'send';
  }

  statusLabel(s: string): string {
    return s === 'pending'
      ? 'Pendiente'
      : s === 'sent'
        ? 'Enviado'
        : s === 'failed'
          ? 'Fallido'
          : s === 'cancelled'
            ? 'Cancelado'
            : s;
  }

  statusBadge(s: string): string {
    return s === 'sent'
      ? 'badge--success'
      : s === 'failed'
        ? 'badge--error'
        : s === 'cancelled'
          ? 'badge--neutral'
          : 'badge--warning';
  }
}
