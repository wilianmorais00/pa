import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientsService } from '../../Service/client-service';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-component.html',
  styleUrls: ['./client-component.css'],
})
export class ClientComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private clientsSvc = inject(ClientsService);

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    room: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    checkin: ['', [Validators.required]],
    checkout: ['', [Validators.required]],
  });

  banner: string | null = null;
  bannerType: 'success' | 'error' = 'success';
  private bannerTimer?: any;

  get f() { return this.form.controls; }

  private showBanner(message: string, type: 'success' | 'error', ms = 3500) {
    this.banner = message;
    this.bannerType = type;
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => (this.banner = null), ms);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    const room = (v.room ?? '').trim();
    const checkin = v.checkin!;
    const checkout = v.checkout!;
    const available = this.clientsSvc.isRoomAvailable(room, checkin, checkout);

    if (!available) {
      this.showBanner('Quarto já direcionado a outro hóspede no período informado.', 'error');
      return;
    }

    const newClient = {
      id: crypto.randomUUID(),
      name: v.fullName!,
      email: v.email!,
      phone: v.phone!,
      room,
      checkin,
      checkout,
    };

    this.clientsSvc.upsert(newClient);
    this.showBanner(`${v.fullName} cadastrado com sucesso.`, 'success');

    this.form.reset();
  }

  cancel() {
    this.router.navigate(['/home']);
  }
}
