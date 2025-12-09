import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// URL do Backend Java
const API_URL = 'http://localhost:8080/usuarios';

export interface AppUser {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);

  // GET: Retorna JSON (Lista), então NÃO mudamos nada aqui
  list(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(API_URL);
  }

  // POST: Retorna Texto, adicionamos { responseType: 'text' }
  create(u: AppUser): Observable<string> {
    return this.http.post(API_URL, u, { responseType: 'text' });
  }

  // PUT: Retorna Texto, adicionamos { responseType: 'text' }
  update(u: AppUser): Observable<string> {
    return this.http.put(`${API_URL}/${u.id}`, u, { responseType: 'text' });
  }

  // DELETE: Retorna Texto, adicionamos { responseType: 'text' }
  remove(id: string): Observable<string> {
    return this.http.delete(`${API_URL}/${id}`, { responseType: 'text' });
  }
}