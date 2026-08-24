import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  category_id: number;
  category: Category;
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

  // Global Filter State (keeps URL clean)
  activeFilters = signal<ProductFilters>({});

  setCategoryFilter(categoryId?: number): void {
    this.activeFilters.update(f => ({ ...f, categoryId }));
  }

  setPriceFilter(minPrice?: number, maxPrice?: number): void {
    this.activeFilters.update(f => ({ ...f, minPrice, maxPrice }));
  }

  clearFilters(): void {
    this.activeFilters.set({});
  }

  getProducts(
    search?: string,
    categoryId?: number,
    minPrice?: number,
    maxPrice?: number
  ): Observable<Product[]> {
    let params = new HttpParams();

    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }
    if (categoryId !== undefined && categoryId !== null) {
      params = params.set('category_id', categoryId.toString());
    }
    if (minPrice !== undefined && minPrice !== null) {
      params = params.set('min_price', minPrice.toString());
    }
    if (maxPrice !== undefined && maxPrice !== null) {
      params = params.set('max_price', maxPrice.toString());
    }

    return this.http.get<Product[]>(`${this.apiUrl}/products`, { params });
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }
}