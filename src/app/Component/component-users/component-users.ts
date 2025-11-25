import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsersService, AppUser } from '../../Service/user-service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './component-users.html',
  styleUrls: ['./component-users.css']
})
export class UsersComponent {
  private fb = inject(FormBuilder);
  private usersSvc = inject(UsersService);

  users = signal<AppUser[]>(this.usersSvc.list());

  flashMsg: string | null = null;
  flashKind: 'success' | 'info' | 'danger' = 'success';
  private flashTimer: any;
  private showFlash(msg: string, kind: 'success' | 'info' | 'danger' = 'success') {
    this.flashMsg = msg;
    this.flashKind = kind;
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => (this.flashMsg = null), 3000);
  }

  pendingDeleteId = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    role: ['colaborador', [Validators.required]],
    active: [true]
  });

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const value = {
      id: raw.id,
      name: raw.name,
      email: raw.email,
      password: raw.password,
      role: raw.role as AppUser['role'],
      active: raw.active as boolean
    };

    if (!value.id) {
      this.usersSvc.create({
        name: value.name,
        email: value.email,
        password: value.password,
        role: value.role,
        active: value.active
      });
      this.showFlash('Usuário cadastrado com sucesso.', 'success');
    } else {
      this.usersSvc.update({
        id: value.id,
        name: value.name,
        email: value.email,
        password: value.password,
        role: value.role,
        active: value.active
      });
      this.showFlash('Usuário atualizado com sucesso.', 'info');
    }

    this.refresh();
    this.clear();
  }

  clear() {
    this.form.reset({
      id: '',
      name: '',
      email: '',
      password: '',
      role: 'colaborador',
      active: true
    });
  }

  edit(u: AppUser) {
    this.form.setValue({
      id: u.id ?? '',
      name: u.name,
      email: u.email,
      password: u.password ?? '',
      role: u.role,
      active: !!u.active
    });
  }

  askRemove(u: AppUser) {
    if (!u.id) return;
    this.pendingDeleteId.set(u.id);
  }

  cancelRemove() {
    this.pendingDeleteId.set(null);
  }

  confirmRemove(u: AppUser) {
    if (!u.id) return;
    this.usersSvc.remove(u.id);
    this.refresh();
    if (this.form.value.id === u.id) this.clear();
    this.pendingDeleteId.set(null);
    this.showFlash(`Usuário "${u.name}" removido.`, 'danger');
  }

  trackById = (_: number, u: AppUser) => u.id ?? '';

  private refresh() {
    this.users.set(this.usersSvc.list());
  }
}
