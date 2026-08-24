import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, effect, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Category, Product, ProductService } from '../../services/product';
import { Cart } from '../../services/cart';
import { RouterLink } from '@angular/router';

export interface PriceRange {
  label: string;
  min: number;
  max: number | null;
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private cartService = inject(Cart);
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);

  allProducts: Product[] = [];
  products: Product[] = [];
  categories: Category[] = [];
  
  selectedCategoryId: number | null = null;
  selectedPriceRange: PriceRange | null = null;
  searchQuery: string = '';
  loading: boolean = true;

  currentPage: number = 1;
  pageSize: number = 12;

  priceRanges: PriceRange[] = [
    { label: 'Under Rs. 1,000', min: 0, max: 1000 },
    { label: 'Rs. 1,000 - Rs. 5,000', min: 1000, max: 5000 },
    { label: 'Rs. 5,000 - Rs. 15,000', min: 5000, max: 15000 },
    { label: 'Above Rs. 15,000', min: 15000, max: null }
  ];

  activeImageMap: { [productId: number]: number } = {};
  private hoverIntervals: { [productId: number]: ReturnType<typeof setInterval> } = {};

  constructor() {
    effect(() => {
      const filters = this.productService.activeFilters();

      if (isPlatformBrowser(this.platformId)) {
        this.selectedCategoryId = filters.categoryId ?? null;
        this.searchQuery = filters.search || '';
        this.currentPage = filters.page || 1;
        this.pageSize = filters.limit || 12;

        if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
          const min = filters.minPrice ?? 0;
          const max = filters.maxPrice ?? null;
          this.selectedPriceRange = this.priceRanges.find(r => r.min === min && r.max === max) || null;
        } else {
          this.selectedPriceRange = null;
        }

        this.loadProducts();
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCategories();
      this.loadProducts();
    } else {
      this.loading = false;
    }
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (data: any) => {
        this.categories = Array.isArray(data) ? data : (data?.categories || []);
      },
      error: (err) => console.error('Failed to load categories', err),
    });
  }

  loadProducts(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loading = true;

    const min = this.selectedPriceRange?.min ?? undefined;
    const max = this.selectedPriceRange?.max ?? undefined;

    this.productService
      .getProducts(this.searchQuery, this.selectedCategoryId ?? undefined, min, max, this.currentPage, this.pageSize)
      .subscribe({
        next: (data: any) => {
          // Safely extract product array regardless of backend payload structure
          let extractedProducts: Product[] = [];

          if (Array.isArray(data)) {
            extractedProducts = data;
          } else if (data && Array.isArray(data.products)) {
            extractedProducts = data.products;
          } else if (data && Array.isArray(data.data)) {
            extractedProducts = data.data;
          } else if (data && Array.isArray(data.items)) {
            extractedProducts = data.items;
          }

          this.products = extractedProducts;
          this.allProducts = extractedProducts;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load products', err);
          this.products = [];
          this.loading = false;
        },
      });
  }

  changePage(newPage: number): void {
    if (newPage < 1) return;
    this.productService.setPage(newPage);
  }

  onCategoryChange(): void {
    this.productService.setCategoryFilter(this.selectedCategoryId ?? undefined);
  }

  onPriceRangeChange(): void {
    const min = this.selectedPriceRange?.min;
    const max = this.selectedPriceRange?.max ?? undefined;
    this.productService.setPriceFilter(min, max);
  }

  onSearchChange(): void {
    this.productService.activeFilters.update(f => ({ ...f, search: this.searchQuery, page: 1 }));
  }

  getSafeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  quickAddToCart(product: Product, event: Event): void {
    event.stopPropagation();
    this.cartService.addToCart(product, 1);
  }

  startSlideshow(product: Product): void {
    if (!product.image_urls || product.image_urls.length <= 1) return;

    if (this.hoverIntervals[product.id]) {
      clearInterval(this.hoverIntervals[product.id]);
    }

    this.hoverIntervals[product.id] = setInterval(() => {
      const currentIndex = this.activeImageMap[product.id] || 0;
      const nextIndex = (currentIndex + 1) % product.image_urls.length;

      this.activeImageMap = {
        ...this.activeImageMap,
        [product.id]: nextIndex,
      };
    }, 1200);
  }

  stopSlideshow(product: Product): void {
    if (this.hoverIntervals[product.id]) {
      clearInterval(this.hoverIntervals[product.id]);
      delete this.hoverIntervals[product.id];
    }

    this.activeImageMap = {
      ...this.activeImageMap,
      [product.id]: 0,
    };
  }

  ngOnDestroy(): void {
    Object.values(this.hoverIntervals).forEach((interval) => clearInterval(interval));
  }
}