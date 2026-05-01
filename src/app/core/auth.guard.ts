import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './types';

const STAFF_ROLES: Role[] = ['admin', 'hr', 'evaluator', 'hiring_manager'];

// authGuard: bloquea cuando no hay token. Si el usuario es worker pero
// intenta entrar a una vista de staff, lo redirige al portal.
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  if (auth.hasRole('worker')) {
    router.navigate(['/portal/inicio']);
    return false;
  }
  return true;
};

// workerGuard: solo permite acceso a usuarios con rol worker.
export const workerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    router.navigate(['/portal/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  if (!auth.hasRole('worker')) {
    router.navigate(['/']);
    return false;
  }
  return true;
};

export function roleGuard(...allowed: Role[]): CanActivateFn {
  return (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) {
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    if (!auth.hasRole(...allowed) && !auth.hasRole(...STAFF_ROLES.filter((r) => allowed.includes(r)))) {
      router.navigate(['/']);
      return false;
    }
    return true;
  };
}
