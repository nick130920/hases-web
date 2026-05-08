import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" role="region" aria-label="Notificaciones" aria-live="polite">
      <div
        *ngFor="let t of toasts.toasts(); trackBy: track"
        class="toast"
        [class.toast--success]="t.kind === 'success'"
        [class.toast--error]="t.kind === 'error'"
        [class.toast--info]="t.kind === 'info'"
        [class.toast--warning]="t.kind === 'warning'"
        role="status"
      >
        <span class="icon icon--sm toast__icon">{{ icon(t) }}</span>
        <span class="toast__text">{{ t.text }}</span>
        <button
          class="toast__close"
          type="button"
          aria-label="Cerrar"
          (click)="toasts.dismiss(t.id)"
        >
          <span class="icon icon--sm">close</span>
        </button>
      </div>
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toasts = inject(ToastService);

  track(_: number, t: Toast): number {
    return t.id;
  }

  icon(t: Toast): string {
    return t.kind === 'success'
      ? 'check_circle'
      : t.kind === 'error'
        ? 'error'
        : t.kind === 'warning'
          ? 'warning'
          : 'info';
  }
}
