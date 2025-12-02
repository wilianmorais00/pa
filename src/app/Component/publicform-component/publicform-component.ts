import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
// Importamos o ClientsService para falar com o Java
import { ClientsService } from '../../Service/client-service';

// --- DEFINIÇÕES LOCAIS (Para não depender de DTOs externos) ---
type BlockType = 'sticker' | 'bar' | 'stars' | 'text';

interface Block {
  id: string;
  type: BlockType;
  title: string;
  required: boolean;
}

// O que vem do Java
interface BackendQuestion {
  id: string;
  prompt: string;
  type: string; // Vem como 'STICKER', 'SLIDER', etc.
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
  // Injeções
  private route = inject(ActivatedRoute);
  private clientsSvc = inject(ClientsService);

  brand = 'QuestIO';
  hotel = 'Carregando...'; // Título provisório
  formTitle = '';
  formDescription = '';

  hospedeId: string | null = null;
  blocks: Block[] = [];
  answers: Record<string, any> = {};

  mode: 'loading' | 'error' | 'form' | 'review' | 'done' = 'loading';
  idx = 0;
  doneAt = '';
  requiredError = false;
  errorMessage = '';

  // Substituímos o constructor pelo ngOnInit para usar rotas do Angular corretamente
  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.hospedeId = params['id'];
      
      if (this.hospedeId) {
        this.carregarDadosDoJava(this.hospedeId);
      } else {
        this.mostrarErro('Link inválido. ID não encontrado.');
      }
    });
  }

  carregarDadosDoJava(id: string) {
    this.clientsSvc.getPublicForm(id).subscribe({
      next: (form: any) => {
        this.hotel = form.title || 'HOTEL AB';
        this.formTitle = form.title;
        this.formDescription = form.description || '';

        // Mapeia do formato Java para o formato do seu Componente (Block)
        this.blocks = (form.questions || [])
          .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
          .map((q: BackendQuestion) => {
            // Converte tipos do Java (UPPERCASE) para o seu front (lowercase)
            let tipoVisual: BlockType = 'sticker';
            const tipoJava = q.type.toUpperCase();

            if (tipoJava === 'SLIDER') tipoVisual = 'bar';
            else if (tipoJava === 'TEXT') tipoVisual = 'text';
            else if (tipoJava === 'STARS') tipoVisual = 'stars';
            else tipoVisual = 'sticker';

            return {
              id: q.id,
              type: tipoVisual,
              title: q.prompt || 'PERGUNTA SEM TÍTULO',
              required: q.required
            };
          });

        if (this.blocks.length > 0) {
          this.mode = 'form';
        } else {
          this.mostrarErro('Formulário sem perguntas.');
        }
      },
      error: (err) => {
        console.error(err);
        const msg = err.error?.message || err.error || 'Erro ao carregar formulário.';
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

  // --- SEUS MÉTODOS ORIGINAIS (Mantidos Iguais) ---

  selectSticker(qid: string, v: 1 | 2 | 3 | 4 | 5) { this.answers[qid] = v; }
  selectStars(qid: string, v: number) { this.answers[qid] = v; }
  onSlider(qid: string, ev: Event) { this.answers[qid] = +(ev.target as HTMLInputElement).value; }
  onText(qid: string, v: string) { this.answers[qid] = v; }

  confirm() {
    const b = this.blocks[this.idx];
    if (!b) return;
    if (b.required) {
      const v = this.answers[b.id];
      const temResposta =
        v !== undefined &&
        v !== null &&
        !(typeof v === 'string' && v.trim() === '') &&
        !(typeof v === 'number' && isNaN(v));

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

  // --- ADAPTAÇÃO NO FINISH (Enviar para o Java) ---
  
  finish() {
    if (!this.hospedeId) return;

    // Prepara o array para o Java
    const payload = Object.keys(this.answers).map(key => ({
      questionId: key,
      value: String(this.answers[key]) // Converte tudo pra string pro Java não reclamar
    }));

    // Envia e mostra a tela de sucesso
    this.clientsSvc.sendAnswers(this.hospedeId, payload).subscribe({
      next: () => {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        this.doneAt = `${dd}/${mm}/${yyyy}`;
        
        this.mode = 'done'; // Tela de agradecimento original
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao enviar. Tente novamente.');
      }
    });
  }
}