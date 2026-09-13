import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/prod/environment';


export interface CheckoutPayload {
  customer_name: string;
  email: string;
  address: string;
  city: string;
  items: { product_id: number; quantity: number }[];
  total_amount: number;
}


@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl; 

  getSavedAddresses(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/addresses`);
  }

  saveAddress(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/user/addresses`, payload);
  }

  placeOrder(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/orders`, payload);
  }

  verifyRazorpay(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments/verify-razorpay`, payload);
  }
}