import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'colaborador' | 'gestor' | 'admin';
  active: boolean;
}

const LS_USERS = 'questio.users';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private _users$ = new BehaviorSubject<AppUser[]>(this.read());
  users$ = this._users$.asObservable();

  list(): AppUser[] {
    return this._users$.value.slice();
  }

  create(u: Omit<AppUser, 'id'>): void {
    const id = this.newId();
    const novo: AppUser = { id, ...u };
    const list = this.list();
    list.push(novo);
    this.persist(list);
  }

  update(u: AppUser): void {
    const list = this.list();
    const i = list.findIndex(x => x.id === u.id);
    if (i >= 0) {
      list[i] = { ...u };
      this.persist(list);
    }
  }

  remove(id: string): void {
    const list = this.list().filter(x => x.id !== id);
    this.persist(list);
  }

  private read(): AppUser[] {
    try {
      const raw = localStorage.getItem(LS_USERS);
      return raw ? (JSON.parse(raw) as AppUser[]) : [];
    } catch {
      return [];
    }
  }

  private persist(list: AppUser[]) {
    localStorage.setItem(LS_USERS, JSON.stringify(list));
    this._users$.next(list);
  }

  private newId(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return Math.random().toString(36).slice(2);
    }
  }
}
