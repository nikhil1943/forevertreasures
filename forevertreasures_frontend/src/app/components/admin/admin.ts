import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminOrder, Category, HeroMedia } from '../../services/admin'; 

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminComponent implements OnInit {
  adminService = inject(AdminService);

  activeTab = signal<'inventory' | 'orders' | 'categories' | 'hero' | 'reviews'>('inventory');

  showCategoryModal = signal<boolean>(false);
  showProductModal = signal<boolean>(false);

  // Category State
  editingCategory = signal<Category | null>(null);
  categoryName = '';
  categorySlug = '';

  // Product State
  editingProduct = signal<any | null>(null);
  newProduct = {
    title: '',
    description: '',
    price: null as number | null,
    stock_quantity: 0,
    category_id: null as number | null
  };

  // Dynamic Image URLs List & Upload Trackers
  imageUrls: string[] = [''];
  isUploadingImage: boolean[] = [false]; 

  // Hero Media State
  newSlide: Partial<HeroMedia> = {
    title: '', subtitle: '', media_url: '', media_type: 'IMAGE',
    cta_link: '/products', cta_text: 'Shop Collection', display_order: 0, is_active: true
  };
  editingSlide = signal<HeroMedia | null>(null);
  
  uploadMode: 'FILE' | 'URL' = 'FILE';
  uploadingFile = false; // Used for Hero Uploads
  selectedHeroFile: File | null = null;
  heroFilePreview: string | null = null;

  statuses: AdminOrder['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  adminReviews: any[] = [];

  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  ngOnInit(): void {
    setTimeout(()=>this.adminService.loadCategories(), 2000);
    this.adminService.loadProducts();
    setTimeout(()=>this.adminService.loadOrders(),3000);
    setTimeout(()=>this.adminService.loadHeroMedia(), 4000);
    setTimeout(()=>this.loadReviews(),5000);
  }

  // ==========================================
  // HELPERS
  // ==========================================
  private resetCategoryForm(): void {
    this.categoryName = ''; this.categorySlug = '';
    this.editingCategory.set(null); this.errorMessage.set('');
  }

  private resetProductForm(): void {
    this.editingProduct.set(null);
    this.newProduct = { title: '', description: '', price: null, stock_quantity: 0, category_id: null };
    this.imageUrls = [''];
    this.isUploadingImage = [false];
    this.errorMessage.set('');
  }

  private generateSlug(text: string): string {
    return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
  }

  trackByIndex(index: number): number { return index; }

  // ==========================================
  // PRODUCT IMAGE UPLOADS
  // ==========================================
  addImageUrlInput(): void { 
    this.imageUrls.push(''); 
    this.isUploadingImage.push(false);
  }

  removeImageUrlInput(index: number): void {
    if (this.imageUrls.length > 1) {
      this.imageUrls.splice(index, 1);
      this.isUploadingImage.splice(index, 1);
    } else {
      this.imageUrls[0] = '';
      this.isUploadingImage[0] = false;
    }
  }

  onFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploadingImage[index] = true; 

    this.adminService.uploadImage(file).subscribe({
      next: (res) => {
        this.imageUrls[index] = res.url; 
        this.isUploadingImage[index] = false; 
        input.value = ''; 
      },
      error: (err) => {
        console.error(err);
        this.setErrorMessage('Failed to upload product image to cloud.');
        this.isUploadingImage[index] = false;
      }
    });
  }

  // ==========================================
  // HERO IMAGE UPLOADS
  // ==========================================
  onHeroFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadingFile = true; // Use uploadingFile, not isLoading
    
    this.adminService.uploadHeroImage(file).subscribe({
      next: (response) => {
        this.newSlide.media_url = response.url;
        this.uploadingFile = false;
        input.value = ''; // Reset input
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.setErrorMessage('Failed to upload hero image.');
        this.uploadingFile = false;
      }
    });
  }

  // ==========================================
  // HERO MEDIA
  // ==========================================
  editHeroSlide(slide: HeroMedia): void {
    this.editingSlide.set(slide);
    this.newSlide = { ...slide }; 
    this.heroFilePreview = slide.media_url;
    this.selectedHeroFile = null;
    this.uploadMode = slide.media_url.startsWith('http') ? 'URL' : 'FILE';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEditHero(): void {
    this.editingSlide.set(null);
    this.resetSlideForm();
  }

  submitHeroMedia(): void {
    if (!this.newSlide.media_url) {
      this.setErrorMessage('Please upload a media file or provide a valid URL.');
      return;
    }
    const currentSlide = this.editingSlide();
    if (currentSlide) {
      this.adminService.updateHeroMedia(currentSlide.id, this.newSlide).subscribe({
        next: () => { this.setSuccessMessage('Hero slide updated successfully!'); this.cancelEditHero(); },
        error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to update hero slide.')
      });
    } else {
      this.adminService.createHeroMedia(this.newSlide).subscribe({
        next: () => { this.setSuccessMessage('Hero slide added successfully!'); this.resetSlideForm(); },
        error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to save hero slide.')
      });
    }
  }

  deleteHeroSlide(id: number): void {
    if (!confirm('Are you sure you want to delete this hero slide?')) return;
    this.adminService.deleteHeroMedia(id).subscribe({
      next: () => this.setSuccessMessage('Hero slide deleted successfully!'),
      error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to delete slide.')
    });
  }

  resetSlideForm(): void {
    this.newSlide = {
      title: '', subtitle: '', media_url: '', media_type: 'IMAGE',
      cta_link: '/products', cta_text: 'Shop Collection', 
      display_order: this.adminService.heroMedia().length, 
      is_active: true
    };
    this.uploadMode = 'FILE';
    this.selectedHeroFile = null;
    this.heroFilePreview = null;
  }

  // ==========================================
  // CATEGORIES
  // ==========================================
  openAddCategoryModal(): void { this.resetCategoryForm(); this.showCategoryModal.set(true); }

  openEditCategoryModal(category: Category): void {
    this.editingCategory.set(category);
    this.categoryName = category.name; this.categorySlug = category.slug || '';
    this.errorMessage.set(''); this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void { this.showCategoryModal.set(false); this.resetCategoryForm(); }

  submitCategory(): void {
    if (!this.categoryName.trim()) { this.setErrorMessage('Category name is required.'); return; }
    const slug = this.categorySlug.trim() ? this.generateSlug(this.categorySlug) : this.generateSlug(this.categoryName);
    const payload = { name: this.categoryName.trim(), slug: slug };
    const currentCategory = this.editingCategory();

    if (currentCategory) {
      this.adminService.updateCategory(currentCategory.id, payload).subscribe({
        next: () => { this.setSuccessMessage('Category updated!'); this.closeCategoryModal(); },
        error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to update category.')
      });
    } else {
      this.adminService.createCategory(payload).subscribe({
        next: () => { this.setSuccessMessage('Category created!'); this.closeCategoryModal(); },
        error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to create category.')
      });
    }
  }

  deleteCategory(id: number): void {
    if (!confirm('Are you sure you want to delete this category?')) return;
    this.adminService.deleteCategory(id).subscribe({
      next: () => this.setSuccessMessage('Category deleted!'),
      error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to delete category.')
    });
  }

  // ==========================================
  // PRODUCTS
  // ==========================================
  openAddProductModal(): void { this.resetProductForm(); this.showProductModal.set(true); }

  openEditProductModal(product: any): void {
    this.editingProduct.set(product);
    this.newProduct = {
      title: product.title || '', description: product.description || '',
      price: product.price || null, stock_quantity: product.stock_quantity || 0, category_id: product.category_id || null
    };

    // Safely parse old data arrays or new image_urls
    const imagesToLoad = product.image_urls || product.images || (product.image_url ? [product.image_url] : []);
    
    if (imagesToLoad.length > 0) {
      this.imageUrls = [...imagesToLoad];
    } else {
      this.imageUrls = [''];
    }
    
    this.isUploadingImage = Array(this.imageUrls.length).fill(false);
    this.errorMessage.set('');
    this.showProductModal.set(true);
  }

  closeProductModal(): void { this.showProductModal.set(false); this.resetProductForm(); }

  submitProduct(): void {
    if (!this.newProduct.title || !this.newProduct.price || !this.newProduct.category_id) {
      this.setErrorMessage('Please fill out all required product fields.');
      return;
    }
    
    if (this.isUploadingImage.includes(true)) {
      this.setErrorMessage('Please wait for images to finish uploading before saving.');
      return;
    }

    const cleanedImages = this.imageUrls.map(url => url.trim()).filter(url => url.length > 0);
    
    const payload = {
      title: this.newProduct.title, description: this.newProduct.description,
      price: Number(this.newProduct.price), stock_quantity: Number(this.newProduct.stock_quantity) || 0,
      category_id: Number(this.newProduct.category_id), 
      image_urls: cleanedImages // 🔑 Fixed payload to send image_urls!
    };

    const currentProduct = this.editingProduct();

    if (currentProduct) {
      this.adminService.updateProduct(currentProduct.id, payload as any).subscribe({
        next: () => { this.setSuccessMessage('Product updated successfully!'); this.closeProductModal(); },
        error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to update product.')
      });
    } else {
      this.adminService.createProduct(payload as any).subscribe({
        next: () => { this.setSuccessMessage('Product created successfully!'); this.closeProductModal(); },
        error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to create product.')
      });
    }
  }

  deleteProduct(id: number): void {
    if (!confirm('Are you sure you want to delete this product?')) return;
    this.adminService.deleteProduct(id).subscribe({
      next: () => this.setSuccessMessage('Product deleted!'),
      error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to delete product.')
    });
  }

  onStockChange(id: number, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.adminService.updateStock(id, val).subscribe({
      next: () => this.setSuccessMessage('Stock level updated!'),
      error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to update stock.')
    });
  }

  // ==========================================
  // ORDERS
  // ==========================================
  onStatusChange(id: number, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as AdminOrder['status'];
    this.adminService.updateOrderStatus(id, status).subscribe({
      next: () => this.setSuccessMessage('Order status updated!'),
      error: (err) => this.setErrorMessage(err.error?.detail || 'Failed to update order status.')
    });
  }

  // ==========================================
  // REVIEWS
  // ==========================================
  loadReviews(): void {
    this.adminService.getReviews().subscribe({
      next: (data) => { this.adminReviews = data; },
      error: (err) => { console.error(err); this.setErrorMessage('Could not load reviews from server.'); }
    });
  }

  moveReviewUp(index: number): void {
    if (index > 0) {
      const temp = this.adminReviews[index];
      this.adminReviews[index] = this.adminReviews[index - 1];
      this.adminReviews[index - 1] = temp;
    }
  }

  moveReviewDown(index: number): void {
    if (index < this.adminReviews.length - 1) {
      const temp = this.adminReviews[index];
      this.adminReviews[index] = this.adminReviews[index + 1];
      this.adminReviews[index + 1] = temp;
    }
  }

  saveReviewSequence(): void {
    const sequencedIds = this.adminReviews.map(r => r.id);
    this.adminService.updateReviewSequence(sequencedIds).subscribe({
      next: () => this.setSuccessMessage('Review sequence updated successfully!'),
      error: (err) => { console.error(err); this.setErrorMessage('Failed to update review sequence.'); }
    });
  }

  getCategoryName(id: number): string {
    const cat = this.adminService.categories().find(c => c.id === id);
    return cat ? cat.name : 'Unassigned';
  }

  private setSuccessMessage(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3000);
  }

  private setErrorMessage(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(''), 4000);
  }
}