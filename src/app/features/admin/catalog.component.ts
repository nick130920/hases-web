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
        <p class="page-subtitle">Motivos de descarte y categorías editables.</p>
      </header>

      <form class="card form-row" (ngSubmit)="add()">
        <label>
          Nuevo motivo de rechazo
          <input [(ngModel)]="label" name="label" required />
        </label>
        <button class="btn btn--primary" type="submit">Agregar</button>
      </form>

      <ul class="chip-list">
        <li *ngFor="let r of reasons()">
          {{ r.label }}
          <button class="chip-list__remove" (click)="remove(r)" aria-label="Eliminar">×</button>
        </li>
      </ul>
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
