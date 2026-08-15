import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { UserProfile, LoginRequest, RegisterRequest } from '../models/user.model';
import { environment } from '../../environments/prod/environment';

export interface AuthResponse {
  requires2FA?: boolean;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  message?: string;
  user?: UserProfile;
}

const ACCESS_TOKEN_KEY = 'ft_jwt_token';
const REFRESH_TOKEN_KEY = 'ft_refresh_token';
const USER_KEY = 'ft_user_profile';

@Injectable({ providedIn: 'root' })
export class AuthService {
  refreshToken() {
      throw new Error('Method not implemented.');
  }
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = `${environment.apiUrl}`;

  token = signal<string | null>(this.loadStoredItem(ACCESS_TOKEN_KEY));
  refreshTokenSignal = signal<string | null>(this.loadStoredItem(REFRESH_TOKEN_KEY));
  currentUser = signal<UserProfile | null>(this.loadStoredUser());

  isLoggedIn = computed(() => !!this.token() && !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'admin');
  savedAddresses = computed(() => this.currentUser()?.addresses || []);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        if (!res.requires2FA && res.access_token && res.refresh_token && res.user) {
          this.handleAuthSuccess(res.access_token, res.refresh_token, res.user);
        }
      })
    );
  }

  verify2FA(data: { email: string; code: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/verify-2fa`, data).pipe(
      tap(res => {
        if (res.access_token && res.refresh_token && res.user) {
          this.handleAuthSuccess(res.access_token, res.refresh_token, res.user);
        }
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap(res => {
        if (res.access_token && res.refresh_token && res.user) {
          this.handleAuthSuccess(res.access_token, res.refresh_token, res.user);
        }
      })
    );
  }

  refreshSession(): Observable<AuthResponse> {
    const rToken = this.getRefreshToken();
    if (!rToken) {
      this.clearLocalSession();
      throw new Error('No refresh token available');
    }

    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/refresh`, { refresh_token: rToken }).pipe(
      tap(res => {
        if (res.access_token) {
          this.token.set(res.access_token);
          if (this.isBrowser) {
            localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
          }
        }
      })
    );
  }

  logout(): void {
    const rToken = this.getRefreshToken();
    if (rToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refresh_token: rToken }).pipe(
        catchError(() => of(null))
      ).subscribe();
    }
    this.clearLocalSession();
  }

  getToken(): string | null {
    return this.token();
  }

  getRefreshToken(): string | null {
    return this.refreshTokenSignal();
  }

  private handleAuthSuccess(accessToken: string, refreshToken: string, user: UserProfile): void {
    this.token.set(accessToken);
    this.refreshTokenSignal.set(refreshToken);
    this.updateUserLocalState(user);

    if (this.isBrowser) {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  private updateUserLocalState(user: UserProfile): void {
    this.currentUser.set(user);
    if (this.isBrowser) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  private clearLocalSession(): void {
    this.token.set(null);
    this.refreshTokenSignal.set(null);
    this.currentUser.set(null);

    if (this.isBrowser) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  private loadStoredItem(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }

  private loadStoredUser(): UserProfile | null {
    if (!this.isBrowser) return null;
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}