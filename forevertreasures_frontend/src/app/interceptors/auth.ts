import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Attach access token to outgoing requests (except for public auth endpoints)
  let authReq = req;
  if (token && !isAuthEndpoint(req.url)) {
    authReq = addTokenHeader(req, token);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Intercept 401 Unauthorized errors on non-auth endpoints
      if (error.status === 401 && !isAuthEndpoint(req.url)) {
        return handle401Error(authReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshSession().pipe(
      switchMap((res) => {
        isRefreshing = false;
        if (res.access_token) {
          refreshTokenSubject.next(res.access_token);
          // Retry the failed request with the newly issued access token
          return next(addTokenHeader(req, res.access_token));
        }
        
        authService.logout();
        return throwError(() => new Error('Failed to refresh authentication session'));
      }),
      catchError((refreshErr) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => refreshErr);
      })
    );
  } else {
    // Queue concurrent requests while a token refresh is actively in progress
    return refreshTokenSubject.pipe(
      filter((token): token is string => token !== null),
      take(1),
      switchMap((token) => next(addTokenHeader(req, token)))
    );
  }
}

function addTokenHeader(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || 
         url.includes('/auth/register') || 
         url.includes('/auth/refresh') || 
         url.includes('/auth/verify-2fa');
}