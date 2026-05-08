import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

/**
 * Servicio de notificaciones efímeras (toasts). Se usa para confirmar
 * acciones rápidas (subida automática de documentos, guardado, etc.) sin
 * bloquear el flujo del usuario. Cada toast se autodestruye tras `ttlMs`.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(kind: ToastKind, text: string, ttlMs = 4000): void {
    const id = this.nextId++;
    this.toasts.update((list) => [...list, { id, kind, text }]);
    if (ttlMs > 0) {
      setTimeout(() => this.dismiss(id), ttlMs);
    }
  }

  success(text: string, ttlMs?: number): void {
    this.show('success', text, ttlMs);
  }
  error(text: string, ttlMs = 6000): void {
    this.show('error', text, ttlMs);
  }
  info(text: string, ttlMs?: number): void {
    this.show('info', text, ttlMs);
  }
  warning(text: string, ttlMs?: number): void {
    this.show('warning', text, ttlMs);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
