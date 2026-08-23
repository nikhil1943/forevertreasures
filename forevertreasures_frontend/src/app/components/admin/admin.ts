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

  // Product Form State
  editingProduct = signal<any | null>(null);
  newProduct = {
    title: '',
    description: '',
    price: null as number | null,
    stock_quantity: 0,
    category_id: null as number | null
  };

  // Dynamic Image URLs List (Supports HTTP URLs and Base64 Data Strings)
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
    this.editingProduct.set(null);
    this.newProduct = {
      title: '',
      description: '',
      price: null,
      stock_quantity: 0,
      category_id: null
    };
    this.imageUrls = [''];
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

  trackByIndex(index: number): number {
    return index;
  }

  // Dynamic Image Input Helpers
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

  // Direct Local Image File Upload (Converts to Base64)
  onFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      // Store Base64 string directly in imageUrls array
      this.imageUrls[index] = reader.result as string;
    };

    reader.readAsDataURL(file);
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

  openEditProductModal(product: any): void {
    this.editingProduct.set(product);
    this.newProduct = {
      title: product.title || '',
      description: product.description || '',
      price: product.price || null,
      stock_quantity: product.stock_quantity || 0,
      category_id: product.category_id || null
    };

    // Load existing image URLs/base64 strings or default to 1 empty field
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      this.imageUrls = [...product.images];
    } else if (product.image_url) {
      this.imageUrls = [product.image_url];
    } else {
      this.imageUrls = [''];
    }

    this.errorMessage.set('');
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

    const cleanedImages = this.imageUrls
      .map(url => url.trim())
      .filter(url => url.length > 0);

    const payload = {
      title: this.newProduct.title,
      description: this.newProduct.description,
      price: Number(this.newProduct.price),
      stock_quantity: Number(this.newProduct.stock_quantity) || 0,
      category_id: Number(this.newProduct.category_id),
      images: cleanedImages
    };

    const currentProduct = this.editingProduct();

    if (currentProduct) {
      // PUT API Request for Update
      this.adminService.updateProduct(currentProduct.id, payload as any).subscribe({
        next: () => {
          this.setSuccessMessage('Product updated successfully!');
          this.closeProductModal();
          this.adminService.loadProducts();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to update product.');
        }
      });
    } else {
      // POST API Request for Create
      this.adminService.createProduct(payload as any).subscribe({
        next: () => {
          this.setSuccessMessage('Product created successfully!');
          this.closeProductModal();
          this.adminService.loadProducts();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to create product.');
        }
      });
    }
  }

  deleteProduct(id: number): void {
    if (!confirm('Are you sure you want to delete this product?')) return;

    this.adminService.deleteProduct(id).subscribe({
      next: () => {
        this.setSuccessMessage('Product deleted successfully!');
        this.adminService.loadProducts();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Failed to delete product.');
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