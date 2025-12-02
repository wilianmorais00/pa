import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Definição das URLs
const BASE_URL = 'http://localhost:8080';
const API_URL = `${BASE_URL}/hospede`; 

// --- Interfaces para o Formulário Público ---
export interface FormQuestion {
  id: string;
  prompt: string;
  type: 'STICKER' | 'SLIDER' | 'TEXT' | 'STARS';
  orderIndex: number;
  required: boolean;
}

export interface PublicForm {
  title: string;
  description?: string;
  questions: FormQuestion[];
}

export interface AnswerDto {
  questionId: string;
  value: string;
}

// --- Interface do Hóspede ---
export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  room: string;
  checkin?: string;
  checkout?: string;
  
  // Link gerado pelo Java (para o botão Copiar)
  linkAcesso?: string;
  
  // ID do formulário atribuído (Vem do Java como número/Long)
  assignedFormId?: number | null; 
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private http = inject(HttpClient);

  // --- MÉTODOS DE HÓSPEDES (CRUD) ---

  // LISTAR
  list(): Observable<Client[]> {
    return this.http.get<Client[]>(`${API_URL}/listar`);
  }

  // SALVAR / EDITAR
  upsert(client: Client): Observable<Client> {
    // Se tiver ID, usa rota de edição
    if (client.id) {
       return this.http.post<Client>(`${API_URL}/editar/${client.id}`, client);
    }
    return this.http.post<Client>(`${API_URL}/salvar`, client);
  }

  // REMOVER
  remove(id: string): Observable<any> {
    return this.http.post(`${API_URL}/apagar/${id}`, {}, { responseType: 'text' });
  }

  // --- LÓGICA DE ATRIBUIÇÃO ---

  // Atribui um formulário ao hóspede
  assignToForm(clientId: string, templateId: string | number): Observable<void> {
    // Chama a rota: PATCH /hospede/{id}/atribuir/{formId}
    return this.http.patch<void>(`${API_URL}/${clientId}/atribuir/${templateId}`, {});
  }

  // Desvincula o formulário
  unassignForm(clientId: string): Observable<void> {
    return this.http.patch<void>(`${API_URL}/${clientId}/desatribuir`, {});
  }

  // --- MÉTODOS DO FORMULÁRIO PÚBLICO (NOVO) ---

  // 1. Busca as perguntas para o hóspede responder
  getPublicForm(hospedeId: string): Observable<PublicForm> {
    return this.http.get<PublicForm>(`${API_URL}/public/${hospedeId}`);
  }

  // 2. Envia as respostas para o backend
  sendAnswers(hospedeId: string, answers: AnswerDto[]): Observable<any> {
    // Nota: O controller de respostas fica em /respostas, não /hospede
    return this.http.post(`${BASE_URL}/respostas/enviar/${hospedeId}`, answers);
  }
}