import { Component, OnInit, inject, signal } from '@angular/core';
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
          Mensajes encolados para envío por email/WhatsApp/SMS con reintento automático.
        </p>
      </header>

      <form class="filters" (ngSubmit)="refresh()">
        <label>
          Estado
          <select [(ngModel)]="filters.status" name="st">
            <option value="">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="sent">Enviados</option>
            <option value="failed">Fallidos</option>
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
        <button class="btn btn--primary" type="submit">Filtrar</button>
      </form>

      <table class="data-table" *ngIf="items().length; else empty">
        <thead>
          <tr>
            <th>Canal</th>
            <th>Destino</th>
            <th>Asunto</th>
            <th>Estado</th>
            <th>Intentos</th>
            <th>Programado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let m of items()">
            <td>{{ m.channel }}</td>
            <td>{{ m.to }}</td>
            <td>{{ m.subject }}</td>
            <td>
              <span class="badge">{{ m.status }}</span>
              <p class="muted" *ngIf="m.last_error">{{ m.last_error }}</p>
            </td>
            <td>{{ m.attempts }}</td>
            <td>{{ m.scheduled_for }}</td>
            <td>
              <button
                class="btn btn--ghost"
                *ngIf="m.status === 'failed' || m.status === 'pending'"
                (click)="retry(m)"
              >
                Re-encolar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listOutbox(this.filters).subscribe({ next: (m) => this.items.set(m ?? []) });
  }

  retry(m: OutboxMessage): void {
    this.api.retryOutbox(m.id).subscribe({ next: () => this.refresh() });
  }
}
