import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

// 1. Protects Cart/Checkout (Requires standard login)
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Redirect to login, remembering where they tried to go
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};

// 2. Hides Login/Register if already logged in
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return router.createUrlTree(['/']);
  }

  return true;
};