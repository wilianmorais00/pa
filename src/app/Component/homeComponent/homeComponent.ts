import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ComponentConfiguration } from '../component-configuration/component-configuration';
import { FormsService, FormTemplate } from '../../Service/forms-service';
// IMPORTANTE: Importar o serviço e interface atualizados
import { ClientsService, Client } from '../../Service/client-service';
import { AuthService } from '../../Service/auth-service';

type OpenFormCard = FormTemplate;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ComponentConfiguration],
  templateUrl: './homeComponent.html',
  styleUrls: ['./homeComponent.css'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private formsSvc = inject(FormsService);
  private clientsSvc = inject(ClientsService);
  private auth = inject(AuthService);

  username = 'USUÁRIO';

  openFormCards: OpenFormCard[] = [];
  private sub?: Subscription;
  private subAuth?: Subscription;

  // Lista local onde guardamos os dados vindos do Java
  clients: Client[] = [];

  searchCtrl = this.fb.control<string>('', { nonNullable: true });
  showAllClients = false;
  selected?: Client | null = null;

  editForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    room: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
  });

  settingsOpen = false;

  assignOpen = false;
  assignFor?: Client | null = null;
  assignSelectedTemplateId: string | null = null;

  flashMsg: string | null = null;
  flashKind: 'success' | 'info' | 'danger' = 'success';
  private flashTimer: any;

  private showFlash(msg: string, kind: 'success' | 'info' | 'danger' = 'success') {
    this.flashMsg = msg;
    this.flashKind = kind;
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => (this.flashMsg = null), 3500);
  }

  ngOnInit(): void {
    // --- CORREÇÃO AQUI ---
    // Removemos a atribuição direta que causava erro
    // this.openFormCards = this.formsSvc.list(); <--- ISSO DAVA ERRO

    // Usamos o subscribe para pegar os dados quando o Java responder
    this.sub = this.formsSvc.list().subscribe({
      next: (list) => {
        this.openFormCards = list;
      },
      error: (err) => console.error('Erro ao carregar formulários', err)
    });

    // Carrega Usuário
    this.username = this.auth.current?.name ?? 'USUÁRIO';
    this.subAuth = this.auth.current$.subscribe(u => {
      this.username = u?.name ?? 'USUÁRIO';
    });

    // Carrega Hóspedes
    this.carregarHospedes();
  }

  // Método para buscar a lista atualizada do Backend
  carregarHospedes() {
    this.clientsSvc.list().subscribe({
      next: (dados) => {
        this.clients = dados;
      },
      error: (err) => console.error('Erro ao carregar lista de hóspedes:', err)
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subAuth?.unsubscribe();
  }

  get hasOpenForms() { return this.openFormCards.length > 0; }
  
  // MUDANÇA: Usa a variável local carregada em vez de chamar list() direto
  get templates(): FormTemplate[] { return this.openFormCards; }
  
  get hasQuery() { return this.searchCtrl.value.trim().length >= 2; }
  
  // Disponíveis para atribuir: Remove o que já está atribuído
  get availableTemplates(): FormTemplate[] {
    const currentId = this.assignFor?.assignedFormId ? String(this.assignFor.assignedFormId) : null;
    return this.openFormCards.filter(t => String(t.id) !== currentId);
  }

  get filteredClients(): Client[] {
    if (this.showAllClients) return this.clients;
    const q = this.searchCtrl.value.trim().toLowerCase();
    if (q.length < 2) return [];
    
    return this.clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.room.toLowerCase().includes(q)
    );
  }

  listAllClients(): void { this.showAllClients = true; }
  clearSearch(): void { this.showAllClients = false; this.searchCtrl.setValue(''); }

  selectClient(c: Client) {
    this.selected = { ...c };
    this.editForm.setValue({
      name: c.name,
      room: c.room,
      email: c.email,
      phone: c.phone,
    });
  }

  cancelEdit() {
    this.selected = null;
    this.editForm.reset();
  }

  // --- SALVAR EDIÇÃO ---
  saveEdits() {
    if (!this.selected || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const form = this.editForm.getRawValue();

    const updated: Client = {
      ...this.selected,
      name: form.name,
      room: form.room,
      email: form.email,
      phone: form.phone,
    };

    this.clientsSvc.upsert(updated).subscribe({
      next: (res) => {
        this.showFlash(`Dados de ${res.name} atualizados com sucesso.`, 'info');
        this.carregarHospedes();
        this.cancelEdit();
      },
      error: (err) => {
        console.error(err);
        this.showFlash('Erro ao atualizar hóspede.', 'danger');
      }
    });
  }

  // --- ATRIBUIÇÃO ---
  assignToClient(c: Client, ev?: MouseEvent) { ev?.stopPropagation(); this.openAssign(c); }
  openAssign(c: Client) { this.assignFor = c; this.assignSelectedTemplateId = null; this.assignOpen = true; }
  closeAssign() { this.assignOpen = false; this.assignFor = null; this.assignSelectedTemplateId = null; }

  confirmAssign() {
    if (!this.assignFor || !this.assignSelectedTemplateId) return;

    if (String(this.assignFor.assignedFormId) === String(this.assignSelectedTemplateId)) {
      // Ajustado para buscar na lista local openFormCards
      const t = this.openFormCards.find(x => String(x.id) === String(this.assignSelectedTemplateId));
      this.showFlash(`Hóspede já possui o formulário ${t?.title ?? ''}.`, 'info');
      return;
    }

    this.clientsSvc.assignToForm(this.assignFor.id!, this.assignSelectedTemplateId).subscribe({
      next: () => {
        const tpl = this.openFormCards.find(x => String(x.id) === String(this.assignSelectedTemplateId));
        this.showFlash(`Formulário ${tpl?.title ?? ''} atribuído com sucesso!`, 'success');
        this.closeAssign();
        this.carregarHospedes();
      },
      error: (err) => {
        console.error(err);
        this.showFlash('Erro ao atribuir formulário.', 'danger');
      }
    });
  }

  // --- EXCLUIR ---
  deleteClient(c: Client, ev?: MouseEvent) {
    ev?.stopPropagation();
    if (!c.id) return;

    if (confirm(`Tem certeza que deseja remover ${c.name}?`)) {
      this.clientsSvc.remove(c.id).subscribe({
        next: () => {
          this.showFlash(`Hóspede ${c.name} excluído.`, 'danger');
          if (this.selected?.id === c.id) this.cancelEdit();
          this.carregarHospedes();
        },
        error: (err) => {
          console.error(err);
          let msg = 'Erro desconhecido ao excluir.';
          if (err.error && typeof err.error === 'string') msg = err.error;
          else if (err.error && err.error.message) msg = err.error.message;
          else if (err.message) msg = err.message;
          this.showFlash(`Falha: ${msg}`, 'danger');
        }
      });
    }
  }

  copiarLink(link: string | undefined, ev?: Event) {
    ev?.stopPropagation();
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        this.showFlash('Link copiado! Pode enviar para o hóspede.', 'success');
      });
    } else {
      this.showFlash('Link não disponível.', 'danger');
    }
  }

  goHome() {}
  openSettings() { this.settingsOpen = true; }
  closeSettings() { this.settingsOpen = false; }
  onClickNewForm() { this.router.navigate(['/forms/new']); }
  onClickNewClient() { this.router.navigate(['/client/new']); }
  
  // Ajuste para usar apenas ID
  openForm(card: OpenFormCard) { 
      if(card.id) this.router.navigate(['/forms/answers', card.id]); 
  }
  
  openFormMenu(e: MouseEvent, _card: OpenFormCard) { e.stopPropagation(); }
  formatDate(iso: string) { return iso ? new Date(iso).toLocaleDateString() : ''; }

  deleteForm(card: OpenFormCard, ev?: MouseEvent) {
    ev?.stopPropagation();
    if (!card.id) return;
    
    this.formsSvc.deleteTemplate(card.id).subscribe({
        next: () => {
            this.showFlash(`Formulário ${card.title} excluído.`, 'danger');
            // Recarrega a lista
            this.formsSvc.list().subscribe(list => this.openFormCards = list);
        },
        error: (err) => this.showFlash('Erro ao excluir formulário.', 'danger')
    });
  }

  editClient(c: Client, ev?: MouseEvent) { ev?.stopPropagation(); this.selectClient(c); }

  getTemplateTitleById(id?: string | number | null): string | undefined {
    if (!id) return undefined;
    const found = this.openFormCards.find(t => String(t.id) === String(id));
    return found?.title;
  }

  openUsers() { this.router.navigate(['/users']); }
}