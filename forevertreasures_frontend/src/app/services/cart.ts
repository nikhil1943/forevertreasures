import { Injectable, signal, computed, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from './product';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class Cart {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  private cartItemsSignal = signal<CartItem[]>([]);

  constructor() {
    if (this.isBrowser) {
      // 1. Read stored cart safely on client only
      try {
        const savedCart = localStorage.getItem('cart_state');
        if (savedCart) {
          this.cartItemsSignal.set(JSON.parse(savedCart));
        }
      } catch (e) {
        console.error('Failed to load cart from local storage', e);
      }

      // 2. Wrap effect inside platform check so build-time renderer bypasses it
      effect(() => {
        try {
          localStorage.setItem('cart_state', JSON.stringify(this.cartItemsSignal()));
        } catch (e) {
          console.error('Failed to save cart to local storage', e);
        }
      });
    }
  }

  readonly items = this.cartItemsSignal.asReadonly();
  
  readonly totalCount = computed(() => 
    this.cartItemsSignal().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly totalPrice = computed(() => 
    this.cartItemsSignal().reduce((sum, item) => sum + (Number(item.product.price) * item.quantity), 0)
  );

  addToCart(product: Product, quantity: number = 1): void {
    this.cartItemsSignal.update(items => {
      const existingIndex = items.findIndex(item => item.product.id === product.id);
      
      if (existingIndex > -1) {
        const updated = [...items];
        const newQty = updated[existingIndex].quantity + quantity;
        const boundedQty = Math.min(newQty, product.stock_quantity);
        updated[existingIndex] = { ...updated[existingIndex], quantity: boundedQty };
        return updated;
      } else {
        const boundedQty = Math.min(quantity, product.stock_quantity);
        return [...items, { product, quantity: boundedQty }];
      }
    });
  }

  removeFromCart(productId: number): void {
    this.cartItemsSignal.update(items => items.filter(item => item.product.id !== productId));
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    
    this.cartItemsSignal.update(items => 
      items.map(item => 
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }

  clearCart(): void {
    this.cartItemsSignal.set([]);
  }
}