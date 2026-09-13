import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProductService, Product, Category, HeroMedia } from '../../services/product';
import { FeedbackService, Review } from '../../services/feedback';
import { environment } from '../../../environments/prod/environment';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private feedbackService = inject(FeedbackService);
  private platformId = inject(PLATFORM_ID);

  heroMedia: HeroMedia[] = [];
  featuredProducts: Product[] = [];
  categories: Category[] = [];
  
  // State array for the customer reviews
  reviews: Review[] = []; 
  currentReviewIndex = 0;
  private reviewAutoScrollTimer: any;
  
  // 🔑 State for the Review Popup
  selectedReview: Review | null = null;
  
  // Footer dynamic year
  currentYear = new Date().getFullYear();

  currentSlideIndex = 0;
  private slideTimeout: any;


  // ==========================================
  // FOOTER LOGIC
  // ==========================================

  supportEmail = environment.supportEmail;
  
  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }



  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadData();
      this.startReviewAutoScroll();
    }
  }

  loadData(): void {
    this.productService.getHeroMedia().subscribe(media => {
      this.heroMedia = media;
      if (this.heroMedia.length > 0) this.startSlideTimer();
    });

    this.productService.getCategories().subscribe(cats => {
      this.categories = cats.slice(0, 4);
    });

    this.productService.getProducts(undefined, undefined, undefined, undefined, 4, 0)
      .subscribe(products => {
        this.featuredProducts = products;
      });

    this.feedbackService.getReviews().subscribe(data => {
      this.reviews = data;
    });
  }

  // ==========================================
  // TESTIMONIALS LOGIC
  // ==========================================
  getStarsArray(rating: number): number[] {
    return Array(rating).fill(0);
  }

  // 🔑 Modal Handlers
  openReviewModal(review: Review): void {
    this.selectedReview = review;
    // Prevent background scrolling while modal is open
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
      this.stopReviewAutoScroll();
    }
  }

  closeReviewModal(): void {
    this.selectedReview = null;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
      this.startReviewAutoScroll();
    }
  }

  startReviewAutoScroll(): void {
    this.reviewAutoScrollTimer = setInterval(() => {
      this.nextReview();
    }, 5000);
  }

  stopReviewAutoScroll(): void {
    if (this.reviewAutoScrollTimer) {
      clearInterval(this.reviewAutoScrollTimer);
    }
  }

  nextReview(): void {
    if (this.reviews && this.reviews.length > 0) {
      this.currentReviewIndex = (this.currentReviewIndex + 1) % this.reviews.length;
    }
  }

  prevReview(): void {
    if (this.reviews && this.reviews.length > 0) {
      this.currentReviewIndex = (this.currentReviewIndex - 1 + this.reviews.length) % this.reviews.length;
    }
  }

  // ==========================================
  // SLIDESHOW LOGIC
  // ==========================================
  startSlideTimer(): void {
    this.clearTimer();
    const currentSlide = this.heroMedia[this.currentSlideIndex];
    if (currentSlide && currentSlide.media_type === 'IMAGE') {
      this.slideTimeout = setTimeout(() => this.nextSlide(), 5000);
    }
  }

  clearTimer(): void {
    if (this.slideTimeout) clearTimeout(this.slideTimeout);
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
    this.stopReviewAutoScroll();
  }
}