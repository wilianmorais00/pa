import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  room: string;
  checkin: string;   
  checkout: string; 
  assignedFormId?: string | null;
}

const LS_KEY = 'questio.clients';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private _clients$ = new BehaviorSubject<Client[]>(this.read());
  clients$ = this._clients$.asObservable();

  list(): Client[] {
    return this._clients$.value.slice();
  }

  upsert(c: Client) {
    const list = this.list();
    const idx = list.findIndex(x => x.id === c.id);
    if (idx >= 0) list[idx] = c;
    else list.push(c);
    this.persist(list);
  }

  remove(id: string) {
    const list = this.list().filter(x => x.id !== id);
    this.persist(list);
  }

  assignToForm(clientId: string, templateId: string): boolean {
    const list = this.list();
    const idx = list.findIndex(x => x.id === clientId);
    if (idx < 0) return false;

    if (list[idx].assignedFormId === templateId) return false;

    list[idx] = { ...list[idx], assignedFormId: templateId };
    this.persist(list);
    return true;
  }

  unassignForm(clientId: string): boolean {
    const list = this.list();
    const idx = list.findIndex(x => x.id === clientId);
    if (idx < 0) return false;

    if (!list[idx].assignedFormId) return false; 
    list[idx] = { ...list[idx], assignedFormId: null };
    this.persist(list);
    return true;
  }

  isRoomAvailable(room: string, startISO: string, endISO: string, ignoreClientId?: string): boolean {
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    if (isNaN(start) || isNaN(end) || start > end) return false;

    const sameRoom = this.list().filter(c => c.room.trim().toLowerCase() === room.trim().toLowerCase());
    for (const c of sameRoom) {
      if (ignoreClientId && c.id === ignoreClientId) continue;
      const cStart = new Date(c.checkin).getTime();
      const cEnd = new Date(c.checkout).getTime();
      const overlap = start <= cEnd && end >= cStart;
      if (overlap) return false;
    }
    return true;
  }

  private read(): Client[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) as Client[] : [];
    } catch {
      return [];
    }
  }
  private persist(list: Client[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    this._clients$.next(list);
  }
}
