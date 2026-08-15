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
import { adminGuard } from './guards/admin-guard';
import { LoginComponent } from './components/login/login';

export const routes: Routes = [
  { path: '', component: LoginComponent, pathMatch: 'full' },
  { path: 'homepage', redirectTo: '', pathMatch: 'full' },
  { path: 'products', component: ProductList },
  { path: 'products/:id', component: ProductDetail },
  { path: 'cart', component: CartComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'order-confirmation', component: OrderConfirmationComponent },
  { path: 'about-us', component: AboutUs },
  { path: 'contact-us', component: ContactUs },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];