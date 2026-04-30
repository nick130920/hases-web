import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { InductionOrgModule } from '../../core/types';

@Component({
  selector: 'app-induction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Inducción organizacional</h1>
        <p class="page-subtitle">
          Define los módulos que todo trabajador debe revisar antes de iniciar el plan funcional.
        </p>
      </header>

      <form class="card form-grid" (ngSubmit)="create()">
        <label class="form-grid__full">
          Título
          <input [(ngModel)]="form.title" name="title" required />
        </label>
        <label class="form-grid__full">
          Contenido
          <textarea [(ngModel)]="form.body" name="body" rows="4"></textarea>
        </label>
        <label>
          Orden
          <input type="number" [(ngModel)]="form.sort_order" name="sort_order" />
        </label>
        <div class="form-actions">
          <button class="btn btn--primary" type="submit">Agregar módulo</button>
        </div>
      </form>

      <ul class="module-list">
        <li *ngFor="let m of modules()">
          <strong>{{ m.sort_order }}. {{ m.title }}</strong>
          <p>{{ m.body }}</p>
        </li>
      </ul>
    </section>
  `,
})
export class InductionComponent implements OnInit {
  private readonly api = inject(ApiService);
  modules = signal<InductionOrgModule[]>([]);
  form = { title: '', body: '', sort_order: 1 };

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.api.listInductionModules().subscribe({ next: (m) => this.modules.set(m ?? []) });
  }

  create(): void {
    if (!this.form.title.trim()) return;
    this.api.createInductionModule(this.form).subscribe({
      next: () => {
        this.form = { title: '', body: '', sort_order: this.form.sort_order + 1 };
        this.refresh();
      },
    });
  }
}
