import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsersService, AppUser } from '../../Service/user-service'; // Ajuste o caminho se precisar

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './component-users.html',
  styleUrls: ['./component-users.css'] // Se tiver CSS
})
export class UsersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersSvc = inject(UsersService);

  // Lista de usuários vinda da API
  users: AppUser[] = [];

  // Controle de mensagens (Flash Messages)
  flashMsg: string | null = null;
  flashKind: 'success' | 'info' | 'danger' = 'success';

  // Controle de deleção
  pendingDeleteId = new FormControl<string | null>(null);

  // Formulário
  form = this.fb.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    role: ['USER', [Validators.required]], // Valor padrão compatível com Java
    active: [true]
  });

  ngOnInit(): void {
    this.refresh();
  }

  // Busca dados no Backend
  refresh() {
    this.usersSvc.list().subscribe({
      next: (data) => {
        this.users = data;
        console.log('Usuários carregados:', data);
      },
      error: (err) => {
        console.error(err);
        this.showFlash('Erro ao carregar usuários.', 'danger');
      }
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const isEditing = !!raw.id;

    // Objeto pronto para enviar
    const userPayload: AppUser = {
      id: raw.id || undefined,
      name: raw.name || '',
      email: raw.email || '',
      password: raw.password || '',
      role: raw.role || 'USER',
      active: raw.active === true
    };

    // Decide se é CREATE ou UPDATE
    let obs$;
    if (isEditing) {
      // OBS: Isso vai falhar até você criar o @PutMapping no Java
      obs$ = this.usersSvc.update(userPayload);
    } else {
      obs$ = this.usersSvc.create(userPayload);
    }

    obs$.subscribe({
      next: () => {
        this.showFlash(`Usuário ${isEditing ? 'editado' : 'criado'} com sucesso!`, 'success');
        this.clear();
        this.refresh();
      },
      error: (err) => {
        console.error(err);
        // Tenta pegar a mensagem de erro que vem do Java (ResponseEntity)
        const msg = err.error || 'Erro ao salvar.';
        this.showFlash(msg, 'danger');
      }
    });
  }

  edit(u: AppUser) {
    this.form.patchValue({
      id: u.id,
      name: u.name,
      email: u.email,
      password: '', // Não preenchemos a senha por segurança
      role: u.role,
      active: u.active
    });
    // Ao editar, senha pode ser opcional (depende da sua lógica, por enquanto deixei obrigatória no form)
  }

  askRemove(u: AppUser) {
    if (u.id) this.pendingDeleteId.setValue(u.id);
  }

  cancelRemove() {
    this.pendingDeleteId.setValue(null);
  }

  confirmRemove(u: AppUser) {
    if (!u.id) return;

    this.usersSvc.remove(u.id).subscribe({
      next: () => {
        this.showFlash('Usuário removido.', 'success');
        this.pendingDeleteId.setValue(null);
        this.refresh();
      },
      error: (err) => {
        console.error(err);
        this.showFlash('Erro ao remover usuário.', 'danger');
      }
    });
  }

  clear() {
    this.form.reset({
      id: '',
      name: '',
      email: '',
      password: '',
      role: 'USER',
      active: true
    });
    this.pendingDeleteId.setValue(null);
  }

  private showFlash(msg: string, kind: 'success' | 'info' | 'danger') {
    this.flashMsg = msg;
    this.flashKind = kind;
    setTimeout(() => this.flashMsg = null, 4000);
  }

  trackById(index: number, item: AppUser) {
    return item.id;
  }
}