import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const PASS = 'admin';
const KEY = 'radio_admin_auth';

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private platformId = inject(PLATFORM_ID);

  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return sessionStorage.getItem(KEY) === '1';
  }

  login(password: string): boolean {
    if (password === PASS) {
      sessionStorage.setItem(KEY, '1');
      return true;
    }
    return false;
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) sessionStorage.removeItem(KEY);
  }
}
