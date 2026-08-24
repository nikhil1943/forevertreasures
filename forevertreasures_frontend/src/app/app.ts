import { Component, OnInit, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Cart } from './services/cart';
import { AuthService } from './services/auth';
import { ProductService, Category } from './services/product';

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
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  totalCount = this.cartService.totalCount;
  isMobileMenuOpen = signal(false);
  categories = signal<Category[]>([]);

  private touchStartY = 0;
  private readonly minSwipeDistance = 50;

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    const isBrowser = isPlatformBrowser(this.platformId);
    
    // Check cache first if in the browser
    if (isBrowser) {
      const cachedCategories = sessionStorage.getItem('ft_nav_categories');
      if (cachedCategories) {
        this.categories.set(JSON.parse(cachedCategories));
        return; 
      }
    }

    // Fetch from API if not cached
    this.productService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        if (isBrowser) {
          sessionStorage.setItem('ft_nav_categories', JSON.stringify(data));
        }
      },
      error: (err) => console.error('Failed to load nav categories:', err)
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

  // Removes ALL filters (Category, Price, and Search)
  clearAllFilters(): void {
    this.closeMobileMenu();
    this.productService.resetFilters();
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