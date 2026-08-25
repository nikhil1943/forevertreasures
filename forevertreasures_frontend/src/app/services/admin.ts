import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../environments/prod/environment';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface AdminProduct {
  id: number;
  title: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category_id: number;
  is_visible?: boolean;
  images?: string[];
  image_url?: string;
}

export interface AdminOrder {
  id: number;
  customerName: string;
  email: string;
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
}

export interface ProductPayload {
  title: string;
  description?: string;
  price: number;
  stock_quantity: number;
  category_id: number;
  images?: string[];
}

export interface HeroMedia {
  id: number;
  title?: string;
  subtitle?: string;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  cta_link?: string;
  cta_text?: string;
  display_order: number;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;

  // Centralized State Signals
  products = signal<AdminProduct[]>([]);
  categories = signal<Category[]>([]);
  orders = signal<AdminOrder[]>([]);
  heroMedia = signal<HeroMedia[]>([]);

  // ==========================================
  // CATEGORY OPERATIONS
  // ==========================================

  loadCategories(): void {
    this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(
      catchError((error) => {
        console.warn('Admin categories fetch failed:', error.message);
        return of([]);
      })
    ).subscribe(data => this.categories.set(data));
  }

  createCategory(payload: { name: string; slug?: string }): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, payload).pipe(
      tap(() => this.loadCategories())
    );
  }

  updateCategory(id: number, payload: { name: string; slug?: string }): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/categories/${id}`, payload).pipe(
      tap(() => this.loadCategories())
    );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categories/${id}`).pipe(
      tap(() => this.loadCategories())
    );
  }

  // ==========================================
  // PRODUCT OPERATIONS
  // ==========================================

  loadProducts(): void {
    this.http.get<AdminProduct[]>(`${this.apiUrl}/products`).pipe(
      catchError((error) => {
        console.warn('Admin products fetch failed:', error.message);
        return of([]);
      })
    ).subscribe(data => this.products.set(data));
  }

  createProduct(payload: ProductPayload): Observable<AdminProduct> {
    return this.http.post<AdminProduct>(`${this.apiUrl}/products`, payload).pipe(
      tap(() => this.loadProducts())
    );
  }

  updateProduct(id: number, payload: ProductPayload): Observable<AdminProduct> {
    return this.http.put<AdminProduct>(`${this.apiUrl}/products/${id}`, payload).pipe(
      tap(() => this.loadProducts())
    );
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`).pipe(
      tap(() => this.loadProducts())
    );
  }

  updateStock(id: number, stock_quantity: number): Observable<AdminProduct> {
    return this.http.patch<AdminProduct>(`${this.apiUrl}/products/${id}/stock`, { stock_quantity }).pipe(
      tap(() => this.loadProducts())
    );
  }

  // ==========================================
  // ORDER OPERATIONS
  // ==========================================

  loadOrders(): void {
    this.http.get<AdminOrder[]>(`${this.apiUrl}/orders`).pipe(
      catchError((error) => {
        console.warn('Admin orders fetch failed:', error.message);
        return of([]);
      })
    ).subscribe(data => this.orders.set(data));
  }

  updateOrderStatus(id: number, status: string): Observable<AdminOrder> {
    return this.http.patch<AdminOrder>(`${this.apiUrl}/orders/${id}/status`, { status }).pipe(
      tap(() => this.loadOrders())
    );
  }

  // ==========================================
  // HERO MEDIA OPERATIONS
  // ==========================================

  loadHeroMedia(): void {
    this.http.get<HeroMedia[]>(`${this.apiUrl}/hero-media`).pipe(
      catchError((error) => {
        console.warn('Admin hero media fetch failed:', error.message);
        return of([]);
      })
    ).subscribe(data => this.heroMedia.set(data));
  }

  createHeroMedia(payload: Partial<HeroMedia>): Observable<HeroMedia> {
    return this.http.post<HeroMedia>(`${this.apiUrl}/hero-media`, payload).pipe(
      tap(() => this.loadHeroMedia())
    );
  }

  deleteHeroMedia(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/hero-media/${id}`).pipe(
      tap(() => this.loadHeroMedia())
    );
  }
}