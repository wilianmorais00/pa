import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ThemeService } from '../../Service/theme.service';

@Component({
  selector: 'app-component-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './component-configuration.html',
  styleUrls: ['./component-configuration.css'],
})
export class ComponentConfiguration {
  @Output() closed = new EventEmitter<void>();

  constructor(private router: Router, private theme: ThemeService) {}

  get isDark(): boolean { return this.theme.isDark; }

  close() { this.closed.emit(); }
  onLangChange(_: string) {}
  toggleTheme() { this.theme.toggle(); }

  logout() {
    this.close();
    this.router.navigate(['/login']);
  }
}
