import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type QuestionType = 'sticker' | 'slider' | 'text' | 'stars';

export interface FormQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  order: number;
  required?: boolean;
}

export interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  questions: FormQuestion[];
  totalAnswers: number;
  lastAnswerAt: string;
}

const LS_KEY = 'questio.templates';

@Injectable({ providedIn: 'root' })
export class FormsService {
  private _templates$ = new BehaviorSubject<FormTemplate[]>(this.load());
  templates$ = this._templates$.asObservable();

  list(): FormTemplate[] {
    return this._templates$.value;
  }

  getById(id: string): FormTemplate | null {
    return this._templates$.value.find(t => t.id === id) ?? null;
  }

  addTemplate(input: { title: string; description?: string; questions: FormQuestion[] }): FormTemplate {
    const t: FormTemplate = {
      id: this.uuid(),
      title: input.title.trim(),
      description: input.description?.trim() ?? '', // 👈 guarda a descrição
      createdAt: new Date().toISOString(),
      questions: input.questions ?? [],
      totalAnswers: 0,
      lastAnswerAt: new Date().toISOString(),
    };
    const next = [t, ...this._templates$.value];
    this._templates$.next(next);
    this.persist(next);
    return t;
  }

  update(id: string, patch: Partial<FormTemplate>) {
    const next = this._templates$.value.map(t => (t.id === id ? { ...t, ...patch } : t));
    this._templates$.next(next);
    this.persist(next);
  }

  upsert(tmpl: FormTemplate) {
    const exists = this._templates$.value.some(t => t.id === tmpl.id);
    const next = exists
      ? this._templates$.value.map(t => (t.id === tmpl.id ? { ...t, ...tmpl } : t))
      : [tmpl, ...this._templates$.value];
    this._templates$.next(next);
    this.persist(next);
  }

  deleteTemplate(id: string): void {
    const next = this._templates$.value.filter(t => t.id !== id);
    this._templates$.next(next);
    this.persist(next);
  }

  private load(): FormTemplate[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as FormTemplate[]) : [];
    } catch {
      return [];
    }
  }

  private persist(list: FormTemplate[]) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(list));
    } catch {}
  }

  private uuid(): string {
    try {
      return crypto.randomUUID();
    } catch {
      return Math.random().toString(36).slice(2);
    }
  }
}
