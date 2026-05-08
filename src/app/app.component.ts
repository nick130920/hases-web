import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <div class="app-root-shell">
      <router-outlet />
    </div>
    <app-toast-container />
  `,
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'HASES RRHH';
}
