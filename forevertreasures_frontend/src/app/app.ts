import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Cart } from './services/cart';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private cartService = inject(Cart);
  private router = inject(Router);
  public authService = inject(AuthService);

  totalCount = this.cartService.totalCount;
  isMobileMenuOpen = signal(false);

  private touchStartY = 0;
  private readonly minSwipeDistance = 50; // Minimum vertical pixel threshold

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    const touchEndY = event.changedTouches[0].clientY;
    const deltaY = this.touchStartY - touchEndY;

    // Detect upward swipe gesture
    if (deltaY > this.minSwipeDistance && this.isMobileMenuOpen()) {
      this.closeMobileMenu();
    }
  }

  handleCartClick(): void {
    this.closeMobileMenu();
    this.router.navigate(['/cart']);
  }

  handleLogout(): void {
    this.closeMobileMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}