import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';

declare var Razorpay: any;

export interface SavedAddress {
  id: number;
  label?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault?: boolean;
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

  savedAddresses: SavedAddress[] = [];
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);

  checkoutForm: FormGroup = this.fb.group({
    customer_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    currency: ['INR'], // 'INR' for India (Razorpay), 'USD' for Global (Stripe)
    paymentMethod: ['razorpay'], // 'razorpay' | 'stripe'
    
    // Address Mode: 'saved' | 'custom'
    addressMode: ['custom'],
    selectedAddressId: [null as number | null],
    
    // Custom Address Fields
    addressLine1: [''],
    addressLine2: [''],
    city: [''],
    state: [''],
    zipCode: [''],

    // Save custom address option
    saveAddress: [false]
  });

  ngOnInit(): void {
    this.loadRazorpayScript();
    this.loadSavedAddresses();
    this.setupAddressValidationLogic();
    this.setupCurrencyPaymentSync();
  }

  private loadRazorpayScript(): void {
    if (!document.getElementById('razorpay-sdk')) {
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }

  private loadSavedAddresses(): void {
    this.isLoading.set(true);
    this.http.get<SavedAddress[]>('/api/user/addresses').subscribe({
      next: (addresses) => {
        this.savedAddresses = addresses;
        this.isLoading.set(false);

        if (this.savedAddresses.length > 0) {
          const defaultAddr = this.savedAddresses.find(a => a.isDefault) || this.savedAddresses[0];
          this.checkoutForm.patchValue({
            addressMode: 'saved',
            selectedAddressId: defaultAddr.id
          });
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.checkoutForm.patchValue({ addressMode: 'custom' });
      }
    });
  }

  private setupAddressValidationLogic(): void {
    this.checkoutForm.get('addressMode')?.valueChanges.subscribe((mode) => {
      const customFields = ['addressLine1', 'city', 'state', 'zipCode'];
      const selectedAddrCtrl = this.checkoutForm.get('selectedAddressId');

      if (mode === 'saved') {
        selectedAddrCtrl?.setValidators([Validators.required]);
        customFields.forEach(field => {
          const ctrl = this.checkoutForm.get(field);
          ctrl?.clearValidators();
          ctrl?.updateValueAndValidity();
        });
        this.checkoutForm.patchValue({ saveAddress: false });
      } else {
        selectedAddrCtrl?.clearValidators();
        customFields.forEach(field => {
          const ctrl = this.checkoutForm.get(field);
          ctrl?.setValidators([Validators.required]);
          ctrl?.updateValueAndValidity();
        });
      }
      selectedAddrCtrl?.updateValueAndValidity();
    });
  }

  private setupCurrencyPaymentSync(): void {
    this.checkoutForm.get('currency')?.valueChanges.subscribe((curr) => {
      if (curr === 'INR') {
        this.checkoutForm.patchValue({ paymentMethod: 'razorpay' });
      } else {
        this.checkoutForm.patchValue({ paymentMethod: 'stripe' });
      }
    });
  }

  onSelectSavedAddress(addressId: number): void {
    this.checkoutForm.patchValue({
      addressMode: 'saved',
      selectedAddressId: addressId
    });
  }

  onSelectCustomAddressMode(): void {
    this.checkoutForm.patchValue({
      addressMode: 'custom',
      selectedAddressId: null
    });
  }

  onSubmit(): void {
    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const formVal = this.checkoutForm.value;

    const line2 = formVal.addressLine2 ? `, ${formVal.addressLine2}` : '';
    const formattedAddress = `${formVal.addressLine1}${line2}, ${formVal.state} ${formVal.zipCode}`;

    const saveAddress$: Observable<unknown> = (formVal.addressMode === 'custom' && formVal.saveAddress)
      ? this.http.post<SavedAddress[]>('/api/user/addresses', {
          label: 'Saved Address',
          fullName: formVal.customer_name,
          phone: '',
          addressLine1: formVal.addressLine1,
          addressLine2: formVal.addressLine2,
          city: formVal.city,
          state: formVal.state,
          zipCode: formVal.zipCode,
          isDefault: this.savedAddresses.length === 0
        })
      : of(null);

    saveAddress$.pipe(
      switchMap(() => {
        const orderPayload: Record<string, any> = {
          customer_name: formVal.customer_name,
          email: formVal.email,
          currency: formVal.currency,
          payment_method: formVal.paymentMethod,
          total_amount: formVal.currency === 'INR' ? 24999 : 299.99,
          items: [{ product_id: 1, quantity: 1 }]
        };

        if (formVal.addressMode === 'saved') {
          orderPayload['address_id'] = formVal.selectedAddressId;
        } else {
          orderPayload['address'] = formattedAddress;
          orderPayload['city'] = formVal.city;
        }

        return this.http.post<any>('/api/orders', orderPayload);
      })
    ).subscribe({
      next: (res) => {
        if (formVal.paymentMethod === 'razorpay') {
          this.launchRazorpayModal(res);
        } else {
          // Stripe flow redirect or embedded confirmation
          this.isSubmitting.set(false);
          this.router.navigate(['/checkout/stripe-pay'], { queryParams: { order_id: res.id } });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to initialize order.');
      }
    });
  }

  private launchRazorpayModal(orderData: any): void {
    const options = {
      key: orderData.razorpay_key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Forever Treasures',
      description: `Order #${orderData.id}`,
      order_id: orderData.razorpay_order_id,
      handler: (response: any) => {
        this.verifyRazorpayPayment({
          order_id: orderData.id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        });
      },
      prefill: {
        name: this.checkoutForm.value.customer_name,
        email: this.checkoutForm.value.email
      },
      theme: {
        color: '#bf953f'
      },
      modal: {
        ondismiss: () => {
          this.isSubmitting.set(false);
        }
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }

  private verifyRazorpayPayment(payload: any): void {
    this.http.post('/api/payments/verify-razorpay', payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/order-confirmation', payload.order_id]);
      },
      error: (err: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Payment verification failed.');
      }
    });
  }
}