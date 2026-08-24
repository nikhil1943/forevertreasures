import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService, Product } from '../../services/product';
import { Cart } from '../../services/cart';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css'
})
export class ProductDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(Cart);
  private sanitizer = inject(DomSanitizer);

  product: Product | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';
  
  galleryImages: string[] = [];
  selectedImageIndex: number = 0;
  
  quantity: number = 1;
  addedMessage: boolean = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.fetchProduct(+idParam);
    }
  }

  fetchProduct(id: number): void {
    this.productService.getProductById(id).subscribe({
      next: (data) => {
        this.product = data;
        this.isLoading = false;
        if (data.image_urls && data.image_urls.length > 0) {
          this.galleryImages = data.image_urls;
        } else {
          this.galleryImages = ['https://via.placeholder.com/600x600?text=No+Image'];
        }
      },
      error: (err) => {
        console.error('Error fetching product details:', err);
        this.errorMessage = 'Product not found or failed to load.';
        this.isLoading = false;
      }
    });
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  getSafeUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  increaseQuantity(): void {
    if (this.product && this.quantity < this.product.stock_quantity) {
      this.quantity++;
    }
  }

  addToCart(): void {
    if (this.product) {
      this.cartService.addToCart(this.product, this.quantity);
      this.addedMessage = true;
      setTimeout(() => {
        this.addedMessage = false;
      }, 2000);
    }
  }
}