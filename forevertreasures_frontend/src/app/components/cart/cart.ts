import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router'; // 🔑 Added Router
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Cart } from '../../services/cart';
import { AuthService } from '../../services/auth'; // 🔑 Added AuthService

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class CartComponent {
  cartService = inject(Cart);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);           // 🔑 Inject Router
  private authService = inject(AuthService); // 🔑 Inject AuthService

  // Directly access the signals from the service
  cartItems = this.cartService.items;
  totalPrice = this.cartService.totalPrice;
  totalCount = this.cartService.totalCount;

  updateQuantity(productId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const newQuantity = parseInt(input.value, 10);
    this.cartService.updateQuantity(productId, newQuantity);
  }

  removeItem(productId: number): void {
    this.cartService.removeFromCart(productId);
  }

  getSafeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  // 🔑 Intercepts the checkout click
  proceedToCheckout(): void {
    if (this.authService.isLoggedIn()) {
      // Allow them straight through to checkout
      this.router.navigate(['/checkout']);
    } else {
      // Send them to the login page, but remember they want to go to checkout!
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
    }
  }
}