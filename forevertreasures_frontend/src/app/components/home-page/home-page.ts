import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/prod/environment';

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, RouterModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
})
export class HomePage {
  supportEmail = environment.supportEmail;
  // logoPath = `${environment.assetUrl}/logo.jpeg`;
  logoPath = `assets/logo.jpeg`;
}
