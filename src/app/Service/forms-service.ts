import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Ajuste para a URL do seu Backend Java
const API_URL = 'http://localhost:8080/forms';

export type QuestionType = 'sticker' | 'slider' | 'text' | 'stars';

export interface FormQuestion {
  id?: string;
  prompt: string;
  type: QuestionType;
  orderIndex: number;
  required?: boolean;
}

export interface FormTemplate {
  id?: string | number;
  title: string;
  description?: string;
  createdAt?: string;
  questions: FormQuestion[];
  totalAnswers?: number;
  lastAnswerAt?: string;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FormsService {
  private http = inject(HttpClient);

  // LISTAR (GET /forms)
  list(): Observable<FormTemplate[]> {
    return this.http.get<FormTemplate[]>(API_URL);
  }

  // BUSCAR POR ID (GET /forms/{id})
  getById(id: string | number): Observable<FormTemplate> {
    return this.http.get<FormTemplate>(`${API_URL}/${id}`);
  }

  // CRIAR / ADICIONAR (POST /forms)
  create(form: Partial<FormTemplate>): Observable<FormTemplate> {
    return this.http.post<FormTemplate>(API_URL, form);
  }

  // Método auxiliar para manter compatibilidade com seu componente antigo
  addTemplate(input: { title: string; description?: string; questions: any[] }): Observable<FormTemplate> {
    const payload: Partial<FormTemplate> = {
      title: input.title,
      description: input.description,
      questions: input.questions.map((q, index) => ({
        prompt: q.prompt,
        // CORREÇÃO CRUCIAL AQUI: .toUpperCase()
        // O Java espera "STICKER", mas o Front usa "sticker". Convertemos aqui.
        type: q.type.toUpperCase(), 
        orderIndex: index,
        required: q.required
      }))
    };
    return this.create(payload);
  }

  // DELETAR (DELETE /forms/{id})
  deleteTemplate(id: string | number): Observable<any> {
    return this.http.delete(`${API_URL}/${id}`);
  }

  // UPDATE (PUT /forms/{id})
  update(id: string | number, form: Partial<FormTemplate>): Observable<FormTemplate> {
    return this.http.put<FormTemplate>(`${API_URL}/${id}`, form);
  }

  // Para compatibilidade
  get templates$(): Observable<FormTemplate[]> {
    return this.list();
  }
}