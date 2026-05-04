import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'hases.theme';
const DATA_ATTR = 'data-theme';

/**
 * ThemeService gestiona el modo claro/oscuro de la aplicacion.
 *
 *  - Persiste la preferencia en localStorage.
 *  - Si el usuario no ha elegido aun, respeta `prefers-color-scheme` del SO.
 *  - Aplica `data-theme` al elemento <html> de manera reactiva (un signal
 *    se sincroniza via `effect`).
 *
 * Para evitar parpadeo en la primera carga (FOUC) hay un pequeno script
 * inline en `index.html` que aplica el atributo antes de que arranque el
 * bundle de Angular.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<ThemeMode>(this.readInitial());

  readonly theme = computed(() => this.themeSignal());
  readonly isDark = computed(() => this.themeSignal() === 'dark');

  constructor() {
    effect(() => {
      const value = this.themeSignal();
      this.applyToDocument(value);
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        // localStorage puede estar bloqueado (modo privado): no es bloqueante.
      }
    });
  }

  toggle(): void {
    this.themeSignal.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  setTheme(value: ThemeMode): void {
    this.themeSignal.set(value);
  }

  private readInitial(): ThemeMode {
    if (typeof window === 'undefined') return 'light';

    const fromAttr = document.documentElement.getAttribute(DATA_ATTR);
    if (fromAttr === 'dark' || fromAttr === 'light') {
      return fromAttr;
    }

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored === 'dark' || stored === 'light') return stored;

    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  private applyToDocument(value: ThemeMode): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(DATA_ATTR, value);
  }
}
