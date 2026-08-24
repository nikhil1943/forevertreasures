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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly cartItemsSignal = signal<CartItem[]>([]);

  constructor() {
    // Prevent SSR/SSG execution of browser APIs completely
    if (this.isBrowser) {
      // 1. Safe initial load from localStorage
      try {
        const savedCart = localStorage.getItem('cart_state');
        if (savedCart) {
          this.cartItemsSignal.set(JSON.parse(savedCart));
        }
      } catch (e) {
        console.error('Failed to load cart from local storage:', e);
      }

      // 2. Wrap effect inside browser block with try/catch guard
      effect(() => {
        try {
          const currentItems = this.cartItemsSignal();
          localStorage.setItem('cart_state', JSON.stringify(currentItems));
        } catch (e) {
          console.error('Failed to save cart state to local storage:', e);
        }
      });
    }
  }

  // Exposed Readonly Signals & Computed Values
  readonly items = this.cartItemsSignal.asReadonly();
  
  readonly totalCount = computed(() => 
    this.cartItemsSignal().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly totalPrice = computed(() => 
    this.cartItemsSignal().reduce((sum, item) => {
      const price = Number(item.product?.price) || 0;
      return sum + (price * item.quantity);
    }, 0)
  );

  // Cart Management Methods
  addToCart(product: Product, quantity: number = 1): void {
    if (!product || quantity <= 0) return;

    this.cartItemsSignal.update(items => {
      const existingIndex = items.findIndex(item => item.product.id === product.id);
      const stockLimit = product.stock_quantity ?? Infinity;
      
      if (existingIndex > -1) {
        const updated = [...items];
        const newQty = updated[existingIndex].quantity + quantity;
        const boundedQty = Math.min(newQty, stockLimit);
        
        updated[existingIndex] = { 
          ...updated[existingIndex], 
          quantity: boundedQty 
        };
        return updated;
      } else {
        const boundedQty = Math.min(quantity, stockLimit);
        return [...items, { product, quantity: boundedQty }];
      }
    });
  }

  removeFromCart(productId: number): void {
    this.cartItemsSignal.update(items => 
      items.filter(item => item.product.id !== productId)
    );
  }

  updateQuantity(productId: number, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(productId);
      return;
    }
    
    this.cartItemsSignal.update(items => 
      items.map(item => {
        if (item.product.id === productId) {
          const stockLimit = item.product.stock_quantity ?? Infinity;
          return { 
            ...item, 
            quantity: Math.min(quantity, stockLimit) 
          };
        }
        return item;
      })
    );
  }

  clearCart(): void {
    this.cartItemsSignal.set([]);
  }
}