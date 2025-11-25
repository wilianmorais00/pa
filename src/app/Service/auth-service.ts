import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UsersService, AppUser as User } from './user-service';

const LS_CURRENT = 'questio.currentUser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _current$ = new BehaviorSubject<User | null>(this.read());
  current$ = this._current$.asObservable();

  constructor(private users: UsersService) {}

  login(email: string, password: string): boolean {
    if (email.trim().toLowerCase() === 'administrador@gmail.com' && password === '202558') {
      const admin: User = {
        id: 'admin',
        name: 'Administrador',
        email: 'administrador@gmail.com',
        password: '202558',
        role: 'admin',
        active: true
      };
      this.persist(admin);
      return true;
    }

    const u = this.users.list().find(
      x =>
        x.active &&
        x.email.trim().toLowerCase() === email.trim().toLowerCase() &&
        x.password === password
    );
    if (!u) return false;

    this.persist(u);
    return true;
  }

  logout() {
    localStorage.removeItem(LS_CURRENT);
    this._current$.next(null);
  }

  get current(): User | null { return this._current$.value; }

  isAdmin(): boolean {
    const u = this._current$.value;
    if (!u) return false;
    const master = u.email.toLowerCase() === 'administrador@gmail.com' && u.password === '202558';
    const roleAdmin = u.role === 'admin';
    return master || roleAdmin;
  }

  private read(): User | null {
    try {
      const raw = localStorage.getItem(LS_CURRENT);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private persist(u: User) {
    localStorage.setItem(LS_CURRENT, JSON.stringify(u));
    this._current$.next(u);
  }
}
