import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // 1. If admin, grant access
  if (authService.isAdmin()) {
    return true;
  }

  // 2. If not logged in at all, redirect to login with returnUrl
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // 3. Logged in, but lacks admin privileges
  return router.createUrlTree(['/']);
};