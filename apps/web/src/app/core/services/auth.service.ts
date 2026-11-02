import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { SessionUser } from '../models/api.model';

/**
 * The signed-in user. The session itself is an httpOnly cookie the page never
 * sees; this only remembers who it belongs to, in memory.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/auth`;

  private readonly _user = signal<SessionUser | null>(null);
  readonly user = this._user.asReadonly();
  readonly signedIn = computed(() => this._user() !== null);

  /** On boot: is there a live session cookie? Never fails — no session is an answer. */
  restoreSession(): Observable<void> {
    return this.http.get<SessionUser>(`${this.base}/me`).pipe(
      tap((user) => this._user.set(user)),
      map(() => undefined),
      catchError(() => {
        this._user.set(null);
        return of(undefined);
      }),
    );
  }

  login(username: string, password: string): Observable<SessionUser> {
    return this.http
      .post<SessionUser>(`${this.base}/login`, { username, password })
      .pipe(tap((user) => this._user.set(user)));
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/password`, { currentPassword, newPassword });
  }

  logout(): void {
    this.http.post(`${this.base}/logout`, {}).subscribe({ error: () => undefined });
    this.expire();
  }

  /** The server no longer accepts the session: forget the user and go to sign-in. */
  expire(): void {
    this._user.set(null);
    void this.router.navigate(['/login']);
  }
}
