import { Routes } from '@angular/router';
import { ProductList } from './components/product-list/product-list';
import { ProductDetail } from './components/product-detail/product-detail';
import { CartComponent } from './components/cart/cart';
import { CheckoutComponent } from './components/checkout/checkout';
import { OrderConfirmationComponent } from './components/order-confirmation/order-confirmation';
import { ContactUs } from './components/contact-us/contact-us';
import { HomePage } from './components/home-page/home-page';
import { AboutUs } from './components/about-us/about-us';
import { AdminComponent } from './components/admin/admin';
import { LoginComponent } from './components/login/login';

// Import your guards (Adjust the path if you added authGuard/guestGuard to the same admin-guard file)
import { adminGuard } from './guards/admin-guard';
import { authGuard, guestGuard } from './guards/auth-guard'; 
import { MyOrdersComponent } from './components/my-orders/my-orders';

export const routes: Routes = [
  // --- DEFAULT ROUTE ---
  { path: '', component: HomePage, pathMatch: 'full' },
  { path: 'homepage', redirectTo: '', pathMatch: 'full' },

  // --- PUBLIC ROUTES (Read-Only) ---
  { path: 'products', component: ProductList },
  { path: 'products/:id', component: ProductDetail },
  { path: 'about-us', component: AboutUs },
  { path: 'contact-us', component: ContactUs },

  // --- GUEST ROUTES (Hidden from logged-in users) ---
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [guestGuard] 
  },

  // --- PROTECTED USER ROUTES (Requires Login) ---
  { 
    path: 'cart', 
    component: CartComponent,
    // canActivate: [authGuard]
  },
  { 
    path: 'checkout', 
    component: CheckoutComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'order-confirmation', 
    component: OrderConfirmationComponent,
    canActivate: [authGuard]
  },

  { path: 'my-orders', component: MyOrdersComponent, canActivate: [authGuard] },

  // --- ADMIN PORTAL (Requires Admin Role) ---
  { 
    path: 'admin', 
    component: AdminComponent, 
    canActivate: [adminGuard] 
  },

  // --- CATCH-ALL FALLBACK ---
  { path: '**', redirectTo: '' }
];