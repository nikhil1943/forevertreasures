import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Category, Product, ProductService } from '../../services/product';
import { Cart } from '../../services/cart'; // <-- Import CartService
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.css',
})
export class ProductList implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private cartService = inject(Cart); // <-- Inject CartService
  private sanitizer = inject(DomSanitizer);

  products: Product[] = [];
  categories: Category[] = [];
  
  selectedCategoryId: number | null = null;
  searchQuery: string = '';
  loading: boolean = true;

  activeImageMap: { [productId: number]: number } = {};
  private hoverIntervals: { [productId: number]: ReturnType<typeof setInterval> } = {};

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (data) => this.categories = data,
      error: (err) => console.error('Failed to load categories', err)
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts(this.searchQuery, this.selectedCategoryId ?? undefined)
      .subscribe({
        next: (data) => {
          this.products = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load products', err);
          this.loading = false;
        }
      });
  }

  onCategorySelect(categoryId: number | null): void {
    this.selectedCategoryId = categoryId;
    this.loadProducts();
  }

  onSearchChange(): void {
    this.loadProducts();
  }

  getSafeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  // Quick add method for the product catalog grid
  quickAddToCart(product: Product, event: Event): void {
    event.stopPropagation(); // Prevents card routerLink from firing on button click
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
        [product.id]: nextIndex
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
      [product.id]: 0
    };
  }

  ngOnDestroy(): void {
    Object.values(this.hoverIntervals).forEach(interval => clearInterval(interval));
  }
}