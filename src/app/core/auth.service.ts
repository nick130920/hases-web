import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
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
  private readonly mePayload = signal<MeResponse | null>(null);

  readonly user = computed(() => this.mePayload());
  readonly isAuthenticated = computed(() => !!this.token);

  get token(): string | null {
    return localStorage.getItem(this.storageKey);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    const url = `${environment.apiUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, { email, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.storageKey, res.token);
        this.refreshMe().subscribe({ error: () => {} });
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.mePayload.set(null);
  }

  refreshMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${environment.apiUrl}/me`).pipe(
      tap((m) => this.mePayload.set(m))
    );
  }

  hasRole(...allowed: Role[]): boolean {
    const u = this.mePayload();
    return !!u && allowed.includes(u.role);
  }
}
