import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ClientsService } from '../../Service/client-service';

// --- TIPOS LOCAIS ---
type BlockType = 'sticker' | 'bar' | 'stars' | 'text';

interface Block {
  id: string;
  type: BlockType;
  title: string;
  required: boolean;
}

// O que vem do Java (DTO em Inglês)
interface BackendQuestion {
  id: string;
  prompt: string;
  type: string;
  orderIndex: number;
  required: boolean;
}

@Component({
  selector: 'app-public-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publicform-component.html',
  styleUrls: ['./publicform-component.css'],
})
export class PublicFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private clientsSvc = inject(ClientsService);

  brand = 'QuestIO';
  hotel = 'Carregando...';
  formTitle = '';
  formDescription = '';

  hospedeId: string | null = null;
  blocks: Block[] = [];
  
  // Guarda as respostas: { "ID_PERGUNTA": "VALOR" }
  answers: Record<string, any> = {};

  mode: 'loading' | 'error' | 'form' | 'review' | 'done' = 'loading';
  idx = 0;
  doneAt = '';
  requiredError = false;
  errorMessage = '';

  ngOnInit() {
    // CORREÇÃO CRÍTICA: Usamos 'params' porque a rota é 'responder/:id'
    this.route.params.subscribe(params => {
      this.hospedeId = params['id'];
      
      if (this.hospedeId) {
        this.carregarDadosDoJava(this.hospedeId);
      } else {
        this.mostrarErro('Link inválido. ID não encontrado na URL.');
      }
    });
  }

  carregarDadosDoJava(id: string) {
    // Garante que começa carregando
    this.mode = 'loading';

    this.clientsSvc.getPublicForm(id).subscribe({
      next: (form: any) => {
        // --- SUCESSO ---
        this.hotel = form.title || 'HOTEL PARCEIRO';
        this.formTitle = form.title;
        this.formDescription = form.description || '';

        this.blocks = (form.questions || [])
          .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
          .map((q: BackendQuestion) => {
            let tipoVisual: BlockType = 'sticker';
            const tipoJava = q.type ? q.type.toUpperCase() : 'TEXT';

            if (tipoJava === 'SLIDER' || tipoJava === 'BAR') tipoVisual = 'bar';
            else if (tipoJava === 'TEXT') tipoVisual = 'text';
            else if (tipoJava === 'STARS') tipoVisual = 'stars';
            else tipoVisual = 'sticker';

            return {
              id: q.id,
              type: tipoVisual,
              title: q.prompt || 'Pergunta',
              required: q.required
            };
          });

        if (this.blocks.length > 0) {
          // Muda de 'loading' para 'form'
          this.mode = 'form';
        } else {
          this.mostrarErro('Formulário sem perguntas.');
        }
      },
      error: (err) => {
        console.error('Erro ao carregar:', err);

        // --- CORREÇÃO DEFINITIVA ---
        // Se o status for 400, é porque o Java bloqueou (Já respondido).
        // Mudamos o modo para 'done' IMEDIATAMENTE.
        if (err.status === 400) {
           this.mode = 'done'; 
           this.doneAt = 'Anteriormente';
           this.hotel = 'Pesquisa Finalizada'; // Título genérico para a tela de done
           return; // Para a execução aqui
        }

        // Se não for 400, é erro de verdade (404, 500, sem net)
        // Mudamos o modo para 'error'
        const msg = err.error?.message || 'Link inválido ou expirado.';
        this.mostrarErro(msg);
      }
    });
  }

  mostrarErro(msg: string) {
    this.mode = 'error';
    this.errorMessage = msg;
  }

  get current(): Block | null {
    return this.mode === 'form' ? this.blocks[this.idx] ?? null : null;
  }

  // --- INTERAÇÕES (Sticker, Stars, etc) ---
  selectSticker(qid: string, v: number) { this.answers[qid] = v; }
  selectStars(qid: string, v: number) { this.answers[qid] = v; }
  onSlider(qid: string, ev: Event) { this.answers[qid] = +(ev.target as HTMLInputElement).value; }
  onText(qid: string, v: string) { this.answers[qid] = v; }

  // --- NAVEGAÇÃO ---
  confirm() {
    const b = this.blocks[this.idx];
    if (!b) return;

    if (b.required) {
      const v = this.answers[b.id];
      // Validação básica: não pode ser null, undefined, nem string vazia
      const temResposta = (v !== undefined && v !== null && String(v).trim() !== '');
      
      this.requiredError = !temResposta;
      if (this.requiredError) return;
    } else {
      this.requiredError = false;
    }

    if (this.idx < this.blocks.length - 1) {
      this.idx += 1;
    } else {
      this.mode = 'review';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // --- ENVIO ---
  finish() {
    // 1. Verifica se existe ID
    if (!this.hospedeId) return;

    // 2. TRUQUE DO TYPESCRIPT:
    // Jogamos numa constante. Como passou pelo if acima, o TS sabe que 'guestId' é string (não null).
    const guestId = this.hospedeId; 

    // 3. Monta o Payload usando a variável local 'guestId'
    const payload = Object.keys(this.answers).map(key => ({
      guestId: guestId, // <--- Aqui estava o erro, agora usa a const segura
      questionId: key,
      value: String(this.answers[key])
    }));

    this.clientsSvc.sendAnswers(payload).subscribe({
      next: () => {
        const d = new Date();
        this.doneAt = d.toLocaleDateString('pt-BR');
        
        this.mode = 'done';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao enviar respostas. Tente novamente.');
      }
    });
  }
}