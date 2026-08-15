import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  mode = signal<'login' | 'register' | '2fa'>('login');
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  // Login Fields
  loginEmail = signal('');
  loginPassword = signal('');

  // 2FA Field
  twoFactorCode = signal('');

  // Register Fields
  regName = signal('');
  regEmail = signal('');
  regPhone = signal('');
  regPassword = signal('');

  onSubmitLogin(event: Event): void {

    if(!this.loginEmail() || !this.loginPassword()) {
      this.errorMessage.set('Please enter both email and password.');
      return;
    }
    event.preventDefault();
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.login({
      email: this.loginEmail(),
      password: this.loginPassword()
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);

        if (res.requires2FA) {
          this.mode.set('2fa');
        } else {
          this.router.navigate([res.user?.role === 'admin' ? '/admin' : '/products']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        // Extracts FastAPI exception detail
        this.errorMessage.set(err.error?.detail || err.error?.message || 'Invalid email or password.');
      }
    });
  }

  onSubmit2FA(event: Event): void {
    event.preventDefault();
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.verify2FA({
      email: this.loginEmail(),
      code: this.twoFactorCode()
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || err.error?.message || 'Invalid or expired code.');
      }
    });
  }

  onSubmitRegister(event: Event): void {
    if(!this.regName() || !this.regEmail() || !this.regPhone() || !this.regPassword()) {
      this.errorMessage.set('Please fill in all registration fields.');
      return;
    }
    event.preventDefault();
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.register({
      fullName: this.regName(),
      email: this.regEmail(),
      phone: this.regPhone(),
      password: this.regPassword()
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || err.error?.message || 'Registration failed.');
      }
    });
  }

  cancel2FA(): void {
    this.twoFactorCode.set('');
    this.errorMessage.set(null);
    this.mode.set('login');
  }
}