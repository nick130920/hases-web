import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { MeResponse, Role } from './types';

export interface LoginResponse {
  token: string;
  expires_in_hours: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'hases_jwt';

  // Signals reactivos: tokenSignal se mantiene sincronizado con localStorage,
  // de modo que `isAuthenticated` (un computed) se reevalua tras login/logout.
  // Antes leiamos localStorage directamente desde el computed, pero como no
  // dependia de ningun signal Angular memorizaba el valor inicial (false) y
  // los guards seguian viendo al usuario como anonimo despues del login.
  private readonly tokenSignal = signal<string | null>(this.readToken());
  private readonly mePayload = signal<MeResponse | null>(null);

  readonly user = computed(() => this.mePayload());
  readonly isAuthenticated = computed(() => !!this.tokenSignal());

  get token(): string | null {
    return this.tokenSignal();
  }

  login(email: string, password: string): Observable<LoginResponse> {
    const url = `${environment.apiUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      tap((res) => this.persistToken(res.token)),
      switchMap((res) =>
        this.refreshMe().pipe(
          map(() => res),
          catchError(() => of(res))
        )
      )
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.tokenSignal.set(null);
    this.mePayload.set(null);
  }

  refreshMe(): Observable<MeResponse> {
    return this.http
      .get<MeResponse>(`${environment.apiUrl}/me`)
      .pipe(tap((m) => this.mePayload.set(m)));
  }

  hasRole(...allowed: Role[]): boolean {
    const u = this.mePayload();
    return !!u && allowed.includes(u.role);
  }

  private persistToken(token: string): void {
    localStorage.setItem(this.storageKey, token);
    this.tokenSignal.set(token);
  }

  private readToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.storageKey);
  }
}
