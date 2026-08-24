import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/prod/environment';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_urls: string[];
  is_visible: boolean;
  category_id?: number;
  category?: Category;
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  activeFilters = signal<ProductFilters>({});

  // ==========================================
  // FILTER METHODS
  // ==========================================

  setCategoryFilter(categoryId?: number): void {
    this.activeFilters.update(f => ({ ...f, categoryId }));
  }

  setPriceFilter(minPrice?: number, maxPrice?: number): void {
    this.activeFilters.update(f => ({ ...f, minPrice, maxPrice }));
  }

  setSearchFilter(search?: string): void {
    this.activeFilters.update(f => ({ ...f, search }));
  }

  resetFilters(): void {
    this.activeFilters.set({});
  }

  // ==========================================
  // API METHODS (Paginated & SSR Safe)
  // ==========================================

  getProducts(
    search?: string,
    categoryId?: number,
    minPrice?: number,
    maxPrice?: number,
    limit: number = 20, // Default to 20 for infinite scroll chunking
    skip: number = 0
  ): Observable<Product[]> {
    let params = new HttpParams();

    if (search && search.trim() !== '') params = params.set('search', search.trim());
    if (categoryId !== undefined && categoryId !== null) params = params.set('category_id', categoryId.toString());
    if (minPrice !== undefined && minPrice !== null) params = params.set('min_price', minPrice.toString());
    if (maxPrice !== undefined && maxPrice !== null) params = params.set('max_price', maxPrice.toString());
    
    // Append pagination parameters
    params = params.set('limit', limit.toString());
    params = params.set('skip', skip.toString());

    return this.http.get<Product[]>(`${this.apiUrl}/products`, { params }).pipe(
      map(res => {
        const list: any[] = Array.isArray(res) ? res : (res as any)?.products || (res as any)?.data || [];
        return list.map(p => ({
          ...p,
          price: Number(p.price) || 0
        }));
      }),
      catchError((error) => {
        console.warn('Products fetch failed (likely SSR build or asleep backend):', error.message);
        return of([]); // Return empty array so the build continues
      })
    );
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(
      map(res => Array.isArray(res) ? res : (res as any)?.categories || (res as any)?.data || []),
      catchError((error) => {
        console.warn('Categories fetch failed:', error.message);
        return of([]); 
      })
    );
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`).pipe(
      map(p => ({
        ...p,
        price: Number(p.price) || 0
      })),
      catchError((error) => {
        console.warn(`Product ${id} fetch failed:`, error.message);
        return of({} as Product); 
      })
    );
  }
}