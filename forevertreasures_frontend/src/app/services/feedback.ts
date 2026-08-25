import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/prod/environment'; // Adjust path if needed

export interface Review {
  id?: number;
  customer_name: string;
  rating: number;
  comment: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  submitReview(review: Review): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/reviews`, review);
  }

  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/reviews`).pipe(
      catchError((error) => {
        console.error('Failed to fetch store reviews:', error);
        return of([]);
      })
    );
  }
}