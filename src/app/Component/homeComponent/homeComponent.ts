import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ComponentConfiguration } from '../component-configuration/component-configuration';
import { FormsService, FormTemplate } from '../../Service/forms-service';
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
    this.openFormCards = this.formsSvc.list();
    this.sub = this.formsSvc.templates$.subscribe(list => (this.openFormCards = list));

    this.username = this.auth.current?.name ?? 'USUÁRIO';
    this.subAuth = this.auth.current$.subscribe(u => {
      this.username = u?.name ?? 'USUÁRIO';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.subAuth?.unsubscribe();
  }

  get hasOpenForms() { return this.openFormCards.length > 0; }
  get templates(): FormTemplate[] { return this.formsSvc.list(); }
  get hasQuery() { return this.searchCtrl.value.trim().length >= 2; }
  get clients(): Client[] { return this.clientsSvc.list(); }
  get availableTemplates(): FormTemplate[] {
    const currentId = this.assignFor?.assignedFormId ?? null;
    return this.formsSvc.list().filter(t => t.id !== currentId);
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

  saveEdits() {
    if (!this.selected || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const current = this.clients.find(x => x.id === this.selected!.id);
    if (!current) {
      this.cancelEdit();
      return;
    }

    const form = this.editForm.getRawValue();
    const updated: Client = {
      ...current,
      name: form.name!,
      room: form.room!,
      email: form.email!,
      phone: form.phone!,
    };

    this.clientsSvc.upsert(updated);
    this.showFlash(`Dados de ${updated.name} atualizados com sucesso.`, 'info');
    this.cancelEdit();
  }

  assignToClient(c: Client, ev?: MouseEvent) { ev?.stopPropagation(); this.openAssign(c); }
  openAssign(c: Client) { this.assignFor = c; this.assignSelectedTemplateId = null; this.assignOpen = true; }
  closeAssign() { this.assignOpen = false; this.assignFor = null; this.assignSelectedTemplateId = null; }

  confirmAssign() {
    if (!this.assignFor || !this.assignSelectedTemplateId) return;

    if (this.assignFor.assignedFormId === this.assignSelectedTemplateId) {
      const t = this.formsSvc.list().find(x => x.id === this.assignSelectedTemplateId);
      this.showFlash(
        `Hóspede já possui o formulário ${t?.title ?? ''}. Remova para reatribuir.`,
        'info'
      );
      return;
    }

    this.clientsSvc.assignToForm(this.assignFor.id, this.assignSelectedTemplateId);
    const tpl = this.formsSvc.list().find(x => x.id === this.assignSelectedTemplateId);
    this.showFlash(`Formulário ${tpl?.title ?? ''} atribuído a ${this.assignFor.name}.`, 'success');
    this.closeAssign();
  }

  goHome() {}
  openSettings() { this.settingsOpen = true; }
  closeSettings() { this.settingsOpen = false; }
  onClickNewForm() { this.router.navigate(['/forms/new']); }
  onClickNewClient() { this.router.navigate(['/client/new']); }
  openForm(card: OpenFormCard) { this.router.navigate(['/forms/answers', card.id]); }
  openFormMenu(e: MouseEvent, _card: OpenFormCard) { e.stopPropagation(); }
  formatDate(iso: string) { return iso ? new Date(iso).toLocaleDateString() : ''; }

  deleteForm(card: OpenFormCard, ev?: MouseEvent) {
    ev?.stopPropagation();
    this.formsSvc.deleteTemplate(card.id);
    this.showFlash(`Formulário ${card.title} excluído.`, 'danger');
    this.openFormCards = this.formsSvc.list();
  }

  editClient(c: Client, ev?: MouseEvent) { ev?.stopPropagation(); this.selectClient(c); }
  deleteClient(c: Client, ev?: MouseEvent) {
    ev?.stopPropagation();
    this.clientsSvc.remove(c.id);
    if (this.selected?.id === c.id) this.cancelEdit();
    this.showFlash(`Hóspede ${c.name} excluído.`, 'danger');
  }

  getTemplateTitleById(id?: string | null): string | undefined {
    if (!id) return undefined;
    const found = this.formsSvc.list().find(t => t.id === id);
    return found?.title;
  }

  openUsers() { this.router.navigate(['/users']); }
}
