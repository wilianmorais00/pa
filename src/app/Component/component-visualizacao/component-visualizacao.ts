import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, switchMap, timer, tap } from 'rxjs'; // Adicionado tap
import { FormsService, FormTemplate, FormQuestion } from '../../Service/forms-service';
import { ResponsesService, FormAnswer } from '../../Service/responses-service';

type QuestionType = 'sticker' | 'stars' | 'slider' | 'text';

interface QuestionStats {
  counts?: number[];
  avg?: number;
  texts?: string[];
}

@Component({
  selector: 'app-component-visualizacao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './component-visualizacao.html',
  styleUrls: ['./component-visualizacao.css'],
})
export class ComponentVisualizacao implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formsSvc = inject(FormsService);
  private responsesSvc = inject(ResponsesService);

  form?: FormTemplate | null;
  questions: FormQuestion[] = [];
  stats: Record<string, QuestionStats> = {};
  private respSub?: Subscription;
  private formSub?: Subscription;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    
    // 1. Carrega o FORMULÁRIO (título, perguntas)
    this.formSub = this.formsSvc.getById(id).subscribe({
      next: (template) => {
        this.form = template;
        this.questions = this.form?.questions ?? [];
        
        // Inicializa estatísticas
        for (const q of this.questions) {
          if (q.id) this.stats[q.id] = this.zeroStats(q);
        }

        // 2. Inicia o monitoramento em tempo real
        this.iniciarMonitoramento(id);
      },
      error: (err) => console.error('❌ Erro ao carregar formulário', err)
    });
  }

  iniciarMonitoramento(id: string | number): void {
    if (this.respSub) this.respSub.unsubscribe();
    
    // Criamos um timer (polling) que dispara a cada 5 segundos
    this.respSub = timer(0, 5000).pipe(
        
        // --- REQUISIÇÃO 1: Busca o FORMULÁRIO COMPLETO ---
        // Isso obriga o Java a recalcular TotalAnswers e LastAnswerAt
        switchMap(() => this.formsSvc.getById(id)), 
        
        // --- Atualiza o cabeçalho (this.form) ---
        tap((updatedForm) => {
            this.form = updatedForm;
        }),
        
        // --- REQUISIÇÃO 2: Busca as RESPOSTAS para calcular o gráfico ---
        switchMap(() => this.responsesSvc.getResponses(id)),
        
        // --- TAPA: Calcula as estatísticas após receber as respostas ---
        tap((respostas) => {
            this.stats = this.buildStats(this.questions, respostas);
        })
        
    ).subscribe({
        // O subscribe final é apenas para manter o stream ativo.
        // O trabalho de atribuição (this.stats = ...) já foi feito no pipe acima.
        error: (err) => console.error('Erro no monitoramento de respostas:', err)
    });
  }


  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
    this.respSub?.unsubscribe();
  }

  goHome(): void { this.router.navigate(['/home']); }

  private zeroStats(q: FormQuestion): QuestionStats {
    const type = q.type.toString().toLowerCase();
    if (type === 'sticker' || type === 'stars') return { counts: [0, 0, 0, 0, 0] };
    if (type === 'slider' || type === 'bar') return { avg: 0 };
    if (type === 'text') return { texts: [] };
    return {};
  }

  private buildStats(questions: FormQuestion[], answers: FormAnswer[]): Record<string, QuestionStats> {
    const out: Record<string, QuestionStats> = {};
    
    // 1. Inicializa tudo zerado novamente para cada atualização
    for (const q of questions) {
      if (q.id) out[q.id] = this.zeroStats(q);
    }

    // 2. Preenche
    for (const a of answers) {
      const q = questions.find(x => x.id && String(x.id).toLowerCase() === String(a.questionId).toLowerCase());
      
      if (!q || !q.id) continue;

      const qId = q.id; 
      const type = q.type.toString().toLowerCase();

      // STICKER / STARS
      if (type === 'sticker' || type === 'stars') {
        const idx = this.toScaleIndex(a.value);
        if (idx >= 0 && out[qId].counts) out[qId].counts![idx] = (out[qId].counts![idx] ?? 0) + 1;
      }

      // SLIDER / BAR
      if (type === 'slider' || type === 'bar') {
        const val = this.toNumber(a.value);
        if (!isNaN(val)) {
          const s = out[qId] as any;
          s['__sum__'] = (s['__sum__'] || 0) + val;
          s['__cnt__'] = (s['__cnt__'] || 0) + 1;
        }
      }

      // TEXT
      if (type === 'text') {
        const txt = String(a.value ?? '').trim();
        if (txt && out[qId].texts) out[qId].texts!.push(txt);
      }
    }

    // 3. Finaliza (Médias)
    for (const q of questions) {
      if (!q.id) continue;
      const type = q.type.toString().toLowerCase();
      const s = out[q.id] as any;

      if (type === 'slider' || type === 'bar') {
        const sum = s['__sum__'] || 0;
        const cnt = s['__cnt__'] || 0;
        out[q.id].avg = cnt > 0 ? +(sum / cnt).toFixed(2) : 0;
        
        delete s['__sum__'];
        delete s['__cnt__'];
      }
      
      if (type === 'text' && out[q.id].texts) {
        out[q.id].texts = (out[q.id].texts ?? []).slice(-5).reverse();
      }
    }

    return out;
  }

  private toScaleIndex(v: unknown): number {
    if (typeof v === 'number') { const n = Math.round(v); return (n >= 1 && n <= 5) ? n - 1 : -1; }
    if (typeof v === 'string') {
      const t = v.toLowerCase().trim();
      if (t === 'true') return 4; 
      if (t === 'false') return 0;
      const n = Number(t.replace(',', '.'));
      if (!isNaN(n) && n >= 1 && n <= 5) return Math.round(n) - 1;
    }
    return -1;
  }

  private toNumber(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const n = Number(v.replace(',', '.')); return !isNaN(n) ? n : NaN; }
    return NaN;
  }

  labelOf(i: number): string { return ['PÉSSIMA', 'RUIM', 'REGULAR', 'BOA', 'EXCELENTE'][i] || ''; }
  emojiOf(i: number): string { return ['😫', '🙁', '😐', '🙂', '😄'][i] || ''; }
}