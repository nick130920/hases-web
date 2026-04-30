import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { Vacancy } from '../../core/types';

interface QuestionDraft {
  [key: string]: unknown;
  section_name: string;
  sort_order: number;
  question_text: string;
  answer_type: 'boolean' | 'scale' | 'text';
}

@Component({
  selector: 'app-interviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <header class="page-head">
        <h1>Plantillas de entrevista</h1>
        <p class="page-subtitle">
          Crea plantillas reutilizables. Las sesiones se asocian a postulaciones desde el detalle.
        </p>
      </header>

      <form class="card form-grid" (ngSubmit)="createTemplate()">
        <label class="form-grid__full">
          Título
          <input [(ngModel)]="form.title" name="title" required />
        </label>
        <label>
          Vacante (opcional)
          <select [(ngModel)]="form.vacancy_id" name="vacancy_id">
            <option value="">Genérica</option>
            <option *ngFor="let v of vacancies()" [value]="v.id">{{ v.title }}</option>
          </select>
        </label>
        <div class="form-actions">
          <button class="btn btn--primary" type="submit">Crear plantilla</button>
        </div>
        <p class="success" *ngIf="lastTemplateId">
          Creada con id: <code>{{ lastTemplateId }}</code>
        </p>
      </form>

      <article class="card" *ngIf="lastTemplateId">
        <h2>Agregar preguntas a {{ lastTemplateId }}</h2>
        <div class="form-grid">
          <label>
            Sección
            <input [(ngModel)]="q.section_name" name="qs" />
          </label>
          <label>
            Orden
            <input type="number" [(ngModel)]="q.sort_order" name="qo" />
          </label>
          <label class="form-grid__full">
            Pregunta
            <input [(ngModel)]="q.question_text" name="qt" />
          </label>
          <label>
            Tipo
            <select [(ngModel)]="q.answer_type" name="qa">
              <option value="text">Texto</option>
              <option value="boolean">Sí/No</option>
              <option value="scale">Escala</option>
            </select>
          </label>
          <div class="form-actions">
            <button class="btn btn--primary" type="button" (click)="addQuestion()">
              Agregar pregunta
            </button>
          </div>
          <p class="success form-grid__full" *ngIf="addedCount > 0">
            Preguntas agregadas: {{ addedCount }}
          </p>
        </div>
      </article>
    </section>
  `,
})
export class InterviewsComponent implements OnInit {
  private readonly api = inject(ApiService);
  vacancies = signal<Vacancy[]>([]);
  form = { title: '', vacancy_id: '' };
  q: QuestionDraft = { section_name: '', sort_order: 1, question_text: '', answer_type: 'text' };
  lastTemplateId = '';
  addedCount = 0;

  ngOnInit(): void {
    this.api.listVacancies().subscribe({ next: (v) => this.vacancies.set(v ?? []) });
  }

  createTemplate(): void {
    if (!this.form.title.trim()) return;
    this.api
      .createInterviewTemplate(this.form.title, this.form.vacancy_id || undefined)
      .subscribe({
        next: (r) => {
          this.lastTemplateId = r.id;
          this.addedCount = 0;
        },
      });
  }

  addQuestion(): void {
    if (!this.lastTemplateId || !this.q.question_text.trim()) return;
    this.api.addInterviewQuestion(this.lastTemplateId, this.q).subscribe({
      next: () => {
        this.addedCount++;
        this.q.question_text = '';
        this.q.sort_order++;
      },
    });
  }
}
