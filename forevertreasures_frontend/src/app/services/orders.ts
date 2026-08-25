import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/prod/environment';


// Make sure this matches the interface in your my-orders.ts component
export interface CustomerOrder {
  id: number;
  date: string; 
  total_amount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Fetches orders for the currently authenticated user
  getOrders(): Observable<CustomerOrder[]> {
    return this.http.get<CustomerOrder[]>(`${this.apiUrl}/orders/my-orders`).pipe(
      catchError((error) => {
        console.error('Failed to fetch orders:', error);
        return of([]); // Return an empty array on error so the page doesn't break
      })
    );
  }
}