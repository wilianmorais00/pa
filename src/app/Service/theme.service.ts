import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly LS_KEY = 'questio.theme';
  private _isDark = false;

  constructor(@Inject(DOCUMENT) private doc: Document) {
    const saved = (localStorage.getItem(this.LS_KEY) || '').toLowerCase();
    this._isDark = saved === 'dark';
    this.apply();
  }

  get isDark(): boolean {
    return this._isDark;
  }

  toggle(): void {
    this._isDark = !this._isDark;
    this.apply();
  }

  private apply(): void {
    const root = this.doc.documentElement; // <html>
    root.classList.toggle('theme-dark', this._isDark);
    localStorage.setItem(this.LS_KEY, this._isDark ? 'dark' : 'light');
  }
}
