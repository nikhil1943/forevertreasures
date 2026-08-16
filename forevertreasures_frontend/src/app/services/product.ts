import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/prod/environment';

// Data Models
// Add the Category interface
export interface Category {
  id: number;
  name: string;
  slug: string;
}

// Update the Product interface
export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  stock_quantity: number;
  image_urls: string[]; // <-- Updated to array
  is_visible: boolean;
  category_id: number;
  category: Category;   // <-- Now TypeScript knows category has a .name property!
}



@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /**
   * Fetch all visible products with optional title search and category filtering
   */
  getProducts(search?: string, categoryId?: number): Observable<Product[]> {
    let params = new HttpParams();

    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }

    if (categoryId !== undefined && categoryId !== null) {
      params = params.set('category_id', categoryId.toString());
    }

    return this.http.get<Product[]>(`${this.apiUrl}/products`, { params });
  }

  /**
   * Fetch all available product categories
   */
  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`);
  }

  /**
   * Fetch details for a specific product by ID
   */
  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }
}