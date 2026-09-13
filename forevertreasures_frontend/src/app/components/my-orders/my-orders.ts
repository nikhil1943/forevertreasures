import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// Adjust the path to match where your actual OrderService is located
import { OrderService, CustomerOrder } from '../../services/orders'; 

// 🔑 Updated interface to match the exact keys sent by the FastAPI backend

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
  private router = inject(Router); // 🔑 Injected Router for the help button

  orders: CustomerOrder[] = [];
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchOrders();
    } else {
      this.isLoading = false; 
    }
  }

  fetchOrders(): void {
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

  // 🔑 Smart routing function for the "Need Help?" button
  contactSupport(orderId: number): void {
    // Navigates to contact page and passes the Order ID in the URL bar
    this.router.navigate(['/contact-us'], { queryParams: { orderRef: orderId } });
  }
}