import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="app-root-shell">
      <router-outlet />
    </div>
  `,
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'HASES RRHH';
}
