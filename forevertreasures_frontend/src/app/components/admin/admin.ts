import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminOrder, Category } from '../../services/admin';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class AdminComponent implements OnInit {
  adminService = inject(AdminService);

  // Active Tab Navigation
  activeTab = signal<'inventory' | 'orders' | 'categories'>('inventory');

  // Modal Display Signals
  showCategoryModal = signal<boolean>(false);
  showProductModal = signal<boolean>(false);

  // Category Form State
  editingCategory = signal<Category | null>(null);
  categoryName = '';
  categorySlug = '';

  // Product Form Model
  newProduct = {
    title: '',
    description: '',
    price: null as number | null,
    stock_quantity: 0,
    category_id: null as number | null
  };

  // Dynamic Image URLs List
  imageUrls: string[] = [''];

  // Order Status Options
  statuses: AdminOrder['status'][] = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  // Feedback Messages
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  ngOnInit(): void {
    this.adminService.loadCategories();
    this.adminService.loadProducts();
    this.adminService.loadOrders();
  }

  // ==========================================
  // HELPER CLEANUP & UTILITY FUNCTIONS
  // ==========================================

  private resetCategoryForm(): void {
    this.categoryName = '';
    this.categorySlug = '';
    this.editingCategory.set(null);
    this.errorMessage.set('');
  }

  private resetProductForm(): void {
    this.newProduct = {
      title: '',
      description: '',
      price: null,
      stock_quantity: 0,
      category_id: null
    };
    this.imageUrls = ['']; // Reset to one empty image field
    this.errorMessage.set('');
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // TrackBy helper for *ngFor over primitive string array
  trackByIndex(index: number): number {
    return index;
  }

  // Dynamic Image URL Inputs
  addImageUrlInput(): void {
    this.imageUrls.push('');
  }

  removeImageUrlInput(index: number): void {
    if (this.imageUrls.length > 1) {
      this.imageUrls.splice(index, 1);
    } else {
      this.imageUrls[0] = '';
    }
  }

  // ==========================================
  // CATEGORY OPERATIONS
  // ==========================================

  openAddCategoryModal(): void {
    this.resetCategoryForm();
    this.showCategoryModal.set(true);
  }

  openEditCategoryModal(category: Category): void {
    this.editingCategory.set(category);
    this.categoryName = category.name;
    this.categorySlug = category.slug || '';
    this.errorMessage.set('');
    this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void {
    this.showCategoryModal.set(false);
    this.resetCategoryForm();
  }

  submitCategory(): void {
    if (!this.categoryName.trim()) {
      this.errorMessage.set('Category name is required.');
      return;
    }

    const slug = this.categorySlug.trim()
      ? this.generateSlug(this.categorySlug)
      : this.generateSlug(this.categoryName);

    const payload = {
      name: this.categoryName.trim(),
      slug: slug
    };

    const currentCategory = this.editingCategory();

    if (currentCategory) {
      this.adminService.updateCategory(currentCategory.id, payload).subscribe({
        next: () => {
          this.setSuccessMessage('Category updated successfully!');
          this.closeCategoryModal();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to update category.');
        }
      });
    } else {
      this.adminService.createCategory(payload).subscribe({
        next: () => {
          this.setSuccessMessage('Category created successfully!');
          this.closeCategoryModal();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to create category.');
        }
      });
    }
  }

  deleteCategory(id: number): void {
    if (!confirm('Are you sure you want to delete this category?')) return;

    this.adminService.deleteCategory(id).subscribe({
      next: () => {
        this.setSuccessMessage('Category deleted successfully!');
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Failed to delete category.');
      }
    });
  }

  // ==========================================
  // PRODUCT OPERATIONS
  // ==========================================

  openAddProductModal(): void {
    this.resetProductForm();
    this.showProductModal.set(true);
  }

  closeProductModal(): void {
    this.showProductModal.set(false);
    this.resetProductForm();
  }

  submitProduct(): void {
    if (!this.newProduct.title || !this.newProduct.price || !this.newProduct.category_id) {
      this.errorMessage.set('Please fill out all required product fields.');
      return;
    }

    // Clean up empty image strings
    const cleanedImages = this.imageUrls
      .map(url => url.trim())
      .filter(url => url.length > 0);

    const payload = {
      title: this.newProduct.title,
      description: this.newProduct.description,
      price: Number(this.newProduct.price),
      stock_quantity: Number(this.newProduct.stock_quantity) || 0,
      category_id: Number(this.newProduct.category_id),
      images: cleanedImages // Array of image URLs
    };

    this.adminService.createProduct(payload as any).subscribe({
      next: () => {
        this.setSuccessMessage('Product created successfully!');
        this.closeProductModal();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Failed to create product.');
      }
    });
  }

  onStockChange(id: number, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.adminService.updateStock(id, val).subscribe({
      next: () => this.setSuccessMessage('Stock level updated!'),
      error: (err) => this.errorMessage.set(err.error?.detail || 'Failed to update stock.')
    });
  }

  // ==========================================
  // ORDER OPERATIONS
  // ==========================================

  onStatusChange(id: number, event: Event): void {
    const status = (event.target as HTMLSelectElement).value as AdminOrder['status'];
    this.adminService.updateOrderStatus(id, status).subscribe({
      next: () => this.setSuccessMessage('Order status updated!'),
      error: (err) => this.errorMessage.set(err.error?.detail || 'Failed to update order status.')
    });
  }

  // ==========================================
  // GENERAL HELPERS
  // ==========================================

  getCategoryName(id: number): string {
    const cat = this.adminService.categories().find(c => c.id === id);
    return cat ? cat.name : 'Unassigned';
  }

  private setSuccessMessage(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(''), 3000);
  }
}