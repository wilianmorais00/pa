import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer, of } from 'rxjs';
import { switchMap, retry, catchError } from 'rxjs/operators';

// Interface que espelha o RespostaDto do Java
export interface FormAnswer {
  questionId: string;
  value: string | number;
}

// URL base do Controller de Respostas (RespostaController.java)
const API_URL = 'http://localhost:8080/respostas';

@Injectable({ providedIn: 'root' })
export class ResponsesService {
  private http = inject(HttpClient);

  // 1. Busca Simples (GET /respostas/form/{id})
  getResponses(formId: string | number): Observable<FormAnswer[]> {
    return this.http.get<FormAnswer[]>(`${API_URL}/form/${formId}`);
  }

  // 2. Busca com Atualização Automática (Watch)
  // Isso faz o gráfico se mexer sozinho quando alguém responde!
  watchResponses(formId: string | number): Observable<FormAnswer[]> {
    // Inicia agora (0) e repete a cada 5000ms (5 segundos)
    return timer(0, 5000).pipe(
      // A cada "tic" do timer, faz a requisição HTTP
      switchMap(() => this.getResponses(formId)),
      
      // Se a rede falhar, tenta 2 vezes antes de desistir
      retry(2),
      
      // Se der erro mesmo assim, retorna lista vazia para não quebrar a tela
      catchError(err => {
        console.error('Erro ao buscar respostas (polling):', err);
        return of([]); 
      })
    );
  }
}