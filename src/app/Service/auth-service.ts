import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, lastValueFrom } from 'rxjs'; // Adicionei lastValueFrom
import { AppUser } from './user-service'; 
import { tap, catchError, map } from 'rxjs/operators';

const LS_CURRENT = 'questio.currentUser';
const API_URL = 'http://localhost:8080/auth';

// O DTO que vem do Java (sem senha)
interface UserLoginResponse extends Omit<AppUser, 'password'> {
  // O Java manda 'role' como string (ADMIN, USER)
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  
  private _current$ = new BehaviorSubject<UserLoginResponse | null>(this.read());
  current$ = this._current$.asObservable();

  constructor() {} 

  // Login agora é ASSÍNCRONO (Promise) e conversa com o Java
  async login(email: string, password: string): Promise<boolean> {
    
    // 1. Simulação do admin hardcoded (SÍNCRONO)
    if (email.trim().toLowerCase() === 'administrador@gmail.com' && password === '202558') {
      const admin: UserLoginResponse = { id: 'admin-master', name: 'Administrador Supremo', email: 'administrador@gmail.com', role: 'ADMIN', active: true };
      this.persist(admin);
      return true;
    }
    
    // 2. Tenta Logar no Java via HTTP (ASSÍNCRONO)
    try {
        const user = await lastValueFrom(
            this.http.post<UserLoginResponse>(`${API_URL}/login`, { email, password })
        );
        this.persist(user);
        return true;
    } catch (error) {
        return false; 
    }
  }

  logout() {
    localStorage.removeItem(LS_CURRENT);
    this._current$.next(null);
  }

  get current(): UserLoginResponse | null { return this._current$.value; }

  isAdmin(): boolean {
    const u = this._current$.value;
    if (!u) return false;
    
    // Verifica a role vinda do Java ('ADMIN') ou a role local ('admin')
    return u.role.toUpperCase() === 'ADMIN' || u.role.toLowerCase() === 'admin'; 
  }

  private read(): UserLoginResponse | null {
    try {
      const raw = localStorage.getItem(LS_CURRENT);
      return raw ? (JSON.parse(raw) as UserLoginResponse) : null;
    } catch {
      return null;
    }
  }

  private persist(u: UserLoginResponse) {
    localStorage.setItem(LS_CURRENT, JSON.stringify(u));
    this._current$.next(u);
  }
}