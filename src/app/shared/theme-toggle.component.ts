import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../core/theme.service';

/**
 * <app-theme-toggle> es un switch accesible para alternar tema claro/oscuro.
 *
 *  - Usa `aria-pressed` para reflejar el estado al lector de pantalla.
 *  - Permite la variante `inverse` para usarse sobre superficies claras
 *    (por ejemplo dentro del panel del login, fuera de la topbar oscura).
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="theme-toggle"
      [class.theme-toggle--inverse]="inverse()"
      [attr.aria-pressed]="isDark()"
      [attr.aria-label]="ariaLabel()"
      [title]="ariaLabel()"
      (click)="toggle()"
    >
      <span class="theme-toggle__icons">
        <span class="icon icon--sm icon--filled">light_mode</span>
        <span class="icon icon--sm icon--filled">dark_mode</span>
      </span>
      <span class="theme-toggle__knob" aria-hidden="true"></span>
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly inverse = input<boolean>(false);

  private readonly themeService = inject(ThemeService);
  readonly isDark = this.themeService.isDark;
  readonly ariaLabel = computed(() =>
    this.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
  );

  toggle(): void {
    this.themeService.toggle();
  }
}
