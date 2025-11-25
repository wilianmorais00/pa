import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface FormAnswer {
  questionId: string;
  value: string | number;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ResponsesService {
  private store = new Map<string, BehaviorSubject<FormAnswer[]>>();

  watchResponses(formId: string): Observable<FormAnswer[]> {
    if (!this.store.has(formId)) this.store.set(formId, new BehaviorSubject<FormAnswer[]>([]));
    return this.store.get(formId)!.asObservable();
  }

  addResponse(formId: string, answer: FormAnswer) {
    if (!this.store.has(formId)) this.store.set(formId, new BehaviorSubject<FormAnswer[]>([]));
    const subj = this.store.get(formId)!;
    subj.next([ ...subj.value, { ...answer, createdAt: new Date().toISOString() } ]);
  }
}
