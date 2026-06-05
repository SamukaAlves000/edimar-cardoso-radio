import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AdminAuthService } from '../services/admin-auth.service';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './admin.html',
})
export class AdminComponent implements OnInit {
  private auth = inject(AdminAuthService);
  private router = inject(Router);

  authenticated = signal(false);
  passField = new FormControl('');
  loginError = signal<string | null>(null);

  ngOnInit() {
    this.authenticated.set(this.auth.isAuthenticated());
    if (this.authenticated()) this.router.navigate(['/admin/dashboard']);
  }

  login() {
    if (this.auth.login(this.passField.value ?? '')) {
      this.authenticated.set(true);
      this.loginError.set(null);
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.loginError.set('Senha incorreta.');
    }
  }

  logout() {
    this.auth.logout();
    this.authenticated.set(false);
  }
}
