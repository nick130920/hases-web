import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { RejectionReason } from '../../core/types';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Catálogos</h1>
        <p class="page-subtitle">
          Motivos de descarte y categorías editables que alimentan los flujos de RR.HH.
        </p>
      </header>

      <article class="card card--accent">
        <div class="card-section-head">
          <h2>
            <span class="icon icon--sm" style="color: var(--color-primary); margin-right: 6px;">
              do_not_disturb
            </span>
            Motivos de rechazo
          </h2>
          <span class="badge badge--neutral">{{ reasons().length }} motivos</span>
        </div>

        <form class="form-row" (ngSubmit)="add()" style="margin-bottom: 18px;">
          <label>
            Nuevo motivo
            <input
              [(ngModel)]="label"
              name="label"
              placeholder="Ej. No cumple requisitos físicos"
              required
            />
          </label>
          <button class="btn btn--primary" type="submit">
            <span class="icon icon--sm">add</span>
            Agregar
          </button>
        </form>

        <ul class="chip-list" *ngIf="reasons().length; else noReasons">
          <li *ngFor="let r of reasons()">
            {{ r.label }}
            <button
              class="chip-list__remove"
              (click)="remove(r)"
              aria-label="Eliminar"
              type="button"
            >
              ×
            </button>
          </li>
        </ul>
        <ng-template #noReasons>
          <p class="empty" style="margin-top: 8px;">
            Sin motivos registrados. Agrega el primero con el formulario superior.
          </p>
        </ng-template>
      </article>
    </section>
  `,
})
export class CatalogComponent implements OnInit {
  private readonly api = inject(ApiService);
  reasons = signal<RejectionReason[]>([]);
  label = '';

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listRejectionReasons().subscribe({ next: (r) => this.reasons.set(r ?? []) });
  }

  add(): void {
    if (!this.label.trim()) return;
    this.api.createRejectionReason(this.label.trim()).subscribe({
      next: () => {
        this.label = '';
        this.refresh();
      },
    });
  }

  remove(r: RejectionReason): void {
    if (!confirm('¿Eliminar este motivo?')) return;
    this.api.deleteRejectionReason(r.id).subscribe({ next: () => this.refresh() });
  }
}
