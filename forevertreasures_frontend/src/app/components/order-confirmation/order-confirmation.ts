import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Import the dedicated feedback service
import { FeedbackService, Review } from '../../services/feedback';

export interface OrderDetails {
  id: number;
  customer_name: string;
  email: string;
  total_amount: number;
}

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule], // Ensure FormsModule is imported
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.css'
})
export class OrderConfirmationComponent implements OnInit {
  private router = inject(Router);
  private feedbackService = inject(FeedbackService);
  
  order: OrderDetails | null = null;

  // Add this property inside your OrderConfirmationComponent class:
  hoverRating = 0;


  // --- Review Form State ---
  reviewForm: Review = {
    customer_name: '',
    rating: 5, // Default to 5 stars
    comment: ''
  };
  
  stars = [1, 2, 3, 4, 5];
  reviewSubmitted = false;
  isSubmitting = false;

  ngOnInit(): void {
    // Read state passed during navigation from CheckoutComponent
    const navigation = this.router.getCurrentNavigation();
    const stateOrder = navigation?.extras.state?.['order'] || history.state?.['order'];

    if (!stateOrder) {
      this.router.navigate(['/products']);
      return;
    }

    this.order = stateOrder;

    // Pre-fill the customer's name in the review form to save them time
    if (this.order?.customer_name) {
      this.reviewForm.customer_name = this.order.customer_name;
    }
  }

  // Add these helper methods to handle mouse movement:
  onStarHover(val: number): void {
    this.hoverRating = val;
  }

  onStarLeave(): void {
    this.hoverRating = 0;
  }

  // --- Feedback Logic ---
  setRating(val: number): void {
    this.reviewForm.rating = val;
  }

  submitFeedback(): void {
    if (!this.reviewForm.customer_name.trim() || !this.reviewForm.comment.trim()) {
      alert("Please provide your name and a brief review.");
      return;
    }

    this.isSubmitting = true;
    
    this.feedbackService.submitReview(this.reviewForm).subscribe({
      next: () => {
        this.reviewSubmitted = true;
        this.isSubmitting = false;
      },
      error: (err) => {
        console.error('Feedback submission error:', err);
        alert("Failed to submit feedback. Please try again.");
        this.isSubmitting = false;
      }
    });
  }
}