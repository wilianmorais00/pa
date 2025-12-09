import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
// Importe a interface Client para garantir a tipagem
import { ClientsService, Client } from '../../Service/client-service';

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

    // --- CORREÇÃO 1: Datas ---
    // O Java usa LocalDateTime, então PRECISA ter o "T" e a hora.
    // Se o usuário não preencher, mandamos string vazia (mas o Validator vai barrar antes)
    const checkinFormatado = v.checkin ? `${v.checkin}T14:00:00` : ''; 
    const checkoutFormatado = v.checkout ? `${v.checkout}T12:00:00` : '';

    const newClient: Client = {
      // --- CORREÇÃO 2: Nome ---
      // O formulário usa 'fullName', mas o Java/DTO espera 'name'
      name: v.fullName, 
      
      email: v.email,
      phone: v.phone,
      room: v.room,
      
      // Enviando as datas com a hora colada
      checkIn: checkinFormatado,
      checkOut: checkoutFormatado
    };

    console.log('Enviando JSON para o Java:', newClient); // <--- OLHE ISSO NO CONSOLE DO NAVEGADOR

    this.clientsSvc.upsert(newClient).subscribe({
      next: (clienteSalvo) => {
        this.showBanner(`${clienteSalvo.name} cadastrado com sucesso!`, 'success');
        this.form.reset();
      },
      error: (err) => {
        console.error('Erro:', err);
        // Tenta pegar a mensagem específica que o Spring mandou
        const msg = err.error?.message || 'Erro de validação (verifique datas ou campos vazios)';
        this.showBanner(msg, 'error');
      }
    });
  }

  cancel() {
    this.router.navigate(['/home']);
  }
}