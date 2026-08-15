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
  private apiUrl = environment.apiUrl + '/orders'; // Adjust to match your backend URL

  placeOrder(CheckoutData: CheckoutPayload): Observable<any> {
    return this.http.post(this.apiUrl, CheckoutData);
  }
}
