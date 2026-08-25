import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';

// Adjust the path to match where your actual OrderService is located
import { OrderService } from '../../services/orders'; 

// Example Interface (adjust this to match what your OrderService actually returns)
export interface CustomerOrder {
  id: number;
  date: string;
  total_amount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  items?: { name: string; quantity: number; price: number }[]; // Optional depending on your API
}

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-orders.html',
  styleUrl: './my-orders.css'
})
export class MyOrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private platformId = inject(PLATFORM_ID);

  orders: CustomerOrder[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchOrders();
    } else {
      this.isLoading = false; // Prevents loading spinner from hanging on SSR
    }
  }

  fetchOrders(): void {
    // Assuming your OrderService has a method to fetch orders for the logged-in user
    this.orderService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load orders', err);
        this.errorMessage = 'Unable to load your order history at this time.';
        this.isLoading = false;
      }
    });
  }
}