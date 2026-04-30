import {
  ApplicationConfig,
  provideAppInitializer,
  inject,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(async () => {
      const auth = inject(AuthService);
      if (auth.isAuthenticated()) {
        try {
          await firstValueFrom(auth.refreshMe());
        } catch {
          auth.logout();
        }
      }
    }),
  ],
};
