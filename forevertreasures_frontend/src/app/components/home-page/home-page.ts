import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProductService, Product, Category, HeroMedia } from '../../services/product';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private platformId = inject(PLATFORM_ID);

  heroMedia: HeroMedia[] = [];
  featuredProducts: Product[] = [];
  categories: Category[] = [];

  currentSlideIndex = 0;
  private slideTimeout: any;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    // 1. Load Hero Slides
    this.productService.getHeroMedia().subscribe(media => {
      this.heroMedia = media;
      if (this.heroMedia.length > 0 && isPlatformBrowser(this.platformId)) {
        this.startSlideTimer();
      }
    });

    // 2. Load Categories
    this.productService.getCategories().subscribe(cats => {
      this.categories = cats.slice(0, 4); // Show top 4 categories
    });

    // 3. Load Featured Products (First 4)
    this.productService.getProducts(undefined, undefined, undefined, undefined, 4, 0)
      .subscribe(products => {
        this.featuredProducts = products;
      });
  }

  // --- SLIDESHOW LOGIC ---
  startSlideTimer(): void {
    this.clearTimer();
    const currentSlide = this.heroMedia[this.currentSlideIndex];
    
    // If it's an image, auto-advance after 5 seconds
    // If it's a video, the (ended) HTML event will trigger nextSlide() instead
    if (currentSlide && currentSlide.media_type === 'IMAGE') {
      this.slideTimeout = setTimeout(() => this.nextSlide(), 5000);
    }
  }

  clearTimer(): void {
    if (this.slideTimeout) {
      clearTimeout(this.slideTimeout);
    }
  }

  nextSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.heroMedia.length;
    this.startSlideTimer();
  }

  prevSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex - 1 + this.heroMedia.length) % this.heroMedia.length;
    this.startSlideTimer();
  }

  setSlide(index: number): void {
    this.currentSlideIndex = index;
    this.startSlideTimer();
  }

  onVideoEnded(): void {
    this.nextSlide();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}