import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../Service/auth-service'; 

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, NgOptimizedImage],
  templateUrl: './logComponent.html',
  styleUrls: ['./logComponent.css'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);

  form = this.fb.group({
    email: ['administrador@gmail.com', [Validators.required, Validators.email]],
    password: ['202558', [Validators.required]],
  });

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    const ok = this.auth.login(String(email), String(password));
    if (!ok) {
      alert('Credenciais inválidas ou usuário inativo.');
      return;
    }

    this.router.navigate(['/home']);
  }
}
