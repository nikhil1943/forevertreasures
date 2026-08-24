import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Cart } from './services/cart';
import { AuthService } from './services/auth';
import { ProductService, Category } from './services/product';

// Universal helper to find an array inside any backend payload structure
function extractArrayFromResponse<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') {
    const keys = ['categories', 'data', 'items', 'results', 'rows', 'products'];
    for (const key of keys) {
      if (Array.isArray(data[key])) return data[key];
    }
    if (data.data) return extractArrayFromResponse<T>(data.data);
  }
  return [];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private cartService = inject(Cart);
  private router = inject(Router);
  private productService = inject(ProductService);
  private platformId = inject(PLATFORM_ID);
  public authService = inject(AuthService);

  totalCount = this.cartService.totalCount;
  isMobileMenuOpen = signal(false);
  categories = signal<Category[]>([]);

  private touchStartY = 0;
  private readonly minSwipeDistance = 50;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCategories();
    }
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (data) => {
        console.log('[Navbar] Raw Categories API Response:', data);
        const extracted = extractArrayFromResponse<Category>(data);
        console.log('[Navbar] Extracted Categories:', extracted);
        this.categories.set(extracted);
      },
      error: (err) => console.error('[Navbar] Failed to load categories:', err)
    });
  }

  filterByCategory(categoryId?: number): void {
    this.closeMobileMenu();
    this.productService.setCategoryFilter(categoryId);
    this.router.navigate(['/products']);
  }

  filterByPrice(minPrice?: number, maxPrice?: number): void {
    this.closeMobileMenu();
    this.productService.setPriceFilter(minPrice, maxPrice);
    this.router.navigate(['/products']);
  }

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