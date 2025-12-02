import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, lastValueFrom } from 'rxjs';
import { tap, first } from 'rxjs/operators';

// URL base do Controller de Usuários
const API_URL = 'http://localhost:8080/usuarios';
const LS_USERS = 'questio.users';

// A interface é a mesma, mas ajustada para o DTO do Java (role USER/ADMIN)
export interface AppUser {
  id?: string;
  name: string;
  email: string;
  password?: string; 
  role: 'colaborador' | 'gestor' | 'admin' | 'USER' | 'ADMIN'; 
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  
  // Mantemos o BehaviorSubject para notificação de mudanças
  private _users$ = new BehaviorSubject<AppUser[]>(this.read());
  users$ = this._users$.asObservable(); // Mantido para componentes que observam

  constructor() {
    // Ao iniciar, carregamos os dados reais do Java e substituímos o localStorage
    this.reloadFromApi().catch(err => console.error("Erro ao carregar usuários da API", err));
  }
  
  // --- MÉTODOS DE LEITURA (SÍNCRONOS/REAIS) ---

  // Retorna o array síncrono da memória (para compatibilidade com componentes)
  list(): AppUser[] {
    return this._users$.value.slice(); 
  }
  
  // Retorna o Observable da lista para quem precisa de dados assíncronos (e a gente usa para recarregar)
  listAsync(): Observable<AppUser[]> {
      return this.http.get<AppUser[]>(API_URL);
  }

  // --- MÉTODOS DE ESCRITA (ASSÍNCRONOS) ---

  // Cria um novo usuário (POST /usuarios)
  async create(u: Omit<AppUser, 'id'>): Promise<void> {
    // 1. Chama a API
    await lastValueFrom(
        this.http.post(`${API_URL}`, u, { responseType: 'text' as 'json' })
    );
    // 2. Se deu sucesso, recarrega a lista local do Subject
    await this.reloadFromApi();
  }

  // Atualiza um usuário (PUT /usuarios/{id})
  async update(u: AppUser): Promise<void> {
    if (!u.id) throw new Error("ID do usuário é necessário para edição.");
    
    // 1. Chama a API
    await lastValueFrom(
        this.http.put<AppUser>(`${API_URL}/${u.id}`, u)
    );
    // 2. Recarrega a lista local
    await this.reloadFromApi();
  }

  // Remove um usuário (DELETE /usuarios/{id})
  async remove(id: string): Promise<void> {
    // 1. Chama a API
    await lastValueFrom(
        this.http.delete<void>(`${API_URL}/${id}`, { responseType: 'text' as 'json' })
    );
    // 2. Recarrega a lista local
    await this.reloadFromApi();
  }
  
  // --- LÓGICA INTERNA (MANTENDO O COMPORTAMENTO ANTIGO) ---
  
  // Recarrega o Subject com dados frescos do Backend
  private async reloadFromApi(): Promise<void> {
      const list = await lastValueFrom(this.listAsync());
      this.persist(list); // Atualiza localStorage e BehaviorSubject
  }

  private read(): AppUser[] {
    try {
      const raw = localStorage.getItem(LS_USERS);
      // Aqui usamos o JSON.parse síncrono, mas é apenas para a inicialização
      return raw ? (JSON.parse(raw) as AppUser[]) : []; 
    } catch {
      return [];
    }
  }

  private persist(list: AppUser[]) {
    localStorage.setItem(LS_USERS, JSON.stringify(list));
    this._users$.next(list);
  }
}