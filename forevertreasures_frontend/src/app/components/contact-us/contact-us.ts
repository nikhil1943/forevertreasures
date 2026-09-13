import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/prod/environment'; // Adjust to your local environment for testing

@Component({
  selector: 'app-contact-us',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-us.html',
  styleUrl: './contact-us.css',
})
export class ContactUs implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute); // 🔑 Allows us to read the URL

  supportEmail = environment.supportEmail;

  isSubmitted = false;
  isSubmitting = false; // Prevents spam clicking
  errorMessage = '';

  contactForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    subject: ['', Validators.required],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  ngOnInit(): void {
    // 🔑 If they came from the "My Orders" page, auto-fill the subject!
    this.route.queryParams.subscribe(params => {
      const orderRef = params['orderRef'];
      if (orderRef) {
        this.contactForm.patchValue({
          subject: `Order Enquiry: #${orderRef}`
        });
      }
    });
  }

  onSubmit(): void {
    if (this.contactForm.valid) {
      this.isSubmitting = true;
      this.errorMessage = '';
      
      const payload = this.contactForm.value;

      // 🔑 Send the data to your FastAPI backend
      this.http.post(`${environment.apiUrl}/api/contact`, payload).subscribe({
        next: () => {
          this.isSubmitted = true;
          this.isSubmitting = false;
          this.contactForm.reset();
        },
        error: (err) => {
          console.error('Contact submission failed', err);
          this.errorMessage = 'Failed to send message. Please try again or email us directly.';
          this.isSubmitting = false;
        }
      });
    } else {
      this.contactForm.markAllAsTouched();
    }
  }
}