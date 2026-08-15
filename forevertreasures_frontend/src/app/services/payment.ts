import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from '../../environments/prod/environment';

export interface PaymentIntentResponse {
  clientSecret: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/payments`;
  private stripePromise: Promise<Stripe | null> = loadStripe('pk_test_YOUR_STRIPE_PUBLISHABLE_KEY');

  getStripe(): Promise<Stripe | null> {
    return this.stripePromise;
  }

  createPaymentIntent(amount: number, currency: string, orderId: number): Observable<PaymentIntentResponse> {
    return this.http.post<PaymentIntentResponse>(`${this.apiUrl}/create-intent`, {
      amount,
      currency,
      order_id: orderId
    });
  }
}