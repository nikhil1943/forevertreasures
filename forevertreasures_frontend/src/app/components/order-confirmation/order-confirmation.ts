import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

export interface OrderDetails {
  id: number;
  customer_name: string;
  email: string;
  total_amount: number;
}

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-confirmation.html',
  styleUrl: './order-confirmation.css'
})
export class OrderConfirmationComponent implements OnInit {
  private router = inject(Router);
  
  order: OrderDetails | null = null;

  ngOnInit(): void {
    // Read state passed during navigation from CheckoutComponent
    const navigation = this.router.getCurrentNavigation();
    const stateOrder = navigation?.extras.state?.['order'] || history.state?.['order'];

    if (!stateOrder) {
      this.router.navigate(['/products']);
      return;
    }

    this.order = stateOrder;
  }
}