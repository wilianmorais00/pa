import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// URL BASE
const BASE_URL = 'http://localhost:8080';
// Ajuste se no seu Controller estiver @RequestMapping("/hospedes") ou "/usuarios"
const API_URL = `${BASE_URL}/hospedes`; 

// --- Interfaces ---

export interface FormQuestion {
  id: string;
  prompt: string;
  type: string; // 'TEXT', 'STARS', etc.
  orderIndex: number;
  required: boolean;
}

export interface PublicForm {
  id: number; // ID do questionário
  title: string;
  description?: string;
  questions: FormQuestion[];
}

// Interface para envio de resposta (Bate com RespostaModel/DTO do Java)
export interface AnswerPayload {
  guestId: string;
  questionId: string;
  value: string;
}

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  room: string;
  
  // Nomes em CamelCase para bater com o Java novo
  checkIn?: string; 
  checkOut?: string;
  emailSent?: boolean;

  // Campos de visualização
  linkAcesso?: string;
  assignedFormId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private http = inject(HttpClient);

  // --- CRUD DE HÓSPEDES ---

  // LISTAR (GET /hospedes)
  list(): Observable<Client[]> {
    return this.http.get<Client[]>(API_URL);
  }

  // CRIAR ou EDITAR
  upsert(client: Client): Observable<Client> {
    // Se tem ID, é Edição (PUT /hospedes/{id})
    if (client.id) {
      return this.http.put<Client>(`${API_URL}/${client.id}`, client);
    }
    // Se não tem ID, é Criação (POST /hospedes)
    return this.http.post<Client>(API_URL, client);
  }

  // REMOVER (DELETE /hospedes/{id})
  remove(id: string): Observable<any> {
    // responseType: 'text' pois o Java pode retornar apenas uma String "Deletado"
    return this.http.delete(`${API_URL}/${id}`, { responseType: 'text' });
  }

  // --- ATRIBUIÇÃO DE FORMULÁRIO ---

  // Atribui: GET ou PUT no endpoint específico criado no Controller
  // Exemplo: @GetMapping("/{id}/atribuir/{formId}") ou PUT
  // Vou usar o padrão que definimos no Controller Java
  assignToForm(clientId: string, formId: number): Observable<any> {
     // Se no Java for void, use responseType: 'text'
    return this.http.put(`${API_URL}/${clientId}/atribuir/${formId}`, {}, { responseType: 'text' });
  }

  unassignForm(clientId: string): Observable<any> {
    return this.http.put(`${API_URL}/${clientId}/desatribuir`, {}, { responseType: 'text' });
  }

  // --- FORMULÁRIO PÚBLICO (RESPONDER) ---

  // 1. Busca o questionário específico daquele hóspede
  // Bate com: @GetMapping("/publico/{id}/questionario") no HospedeController
  getPublicForm(hospedeId: string): Observable<PublicForm> {
    // Atenção à rota: /hospedes/publico/...
    return this.http.get<PublicForm>(`${API_URL}/publico/${hospedeId}/questionario`);
  }

  // 2. Envia as respostas em Lote
  // Bate com: @PostMapping("/respostas/lote") no RespostaController
  // O payload já é uma lista de objetos { guestId, questionId, value }
  sendAnswers(payload: AnswerPayload[]): Observable<string> {
    return this.http.post(`${BASE_URL}/respostas/lote`, payload, { responseType: 'text' });
  }
}