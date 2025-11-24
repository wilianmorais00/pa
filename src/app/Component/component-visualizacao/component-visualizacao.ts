import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    this.form = this.formsSvc.getById(id);
    this.questions = this.form?.questions ?? [];

    for (const q of this.questions) this.stats[q.id] = this.zeroStats(q);

    this.respSub = this.responsesSvc
      .watchResponses(id)
      .subscribe((list: FormAnswer[] | undefined) => {
        this.stats = this.buildStats(this.questions, list ?? []);
      });
  }

  ngOnDestroy(): void {
    this.respSub?.unsubscribe();
  }

  goHome(): void { this.router.navigate(['/home']); }

  private zeroStats(q: FormQuestion): QuestionStats {
    if (q.type === 'sticker' || q.type === 'stars') return { counts: [0, 0, 0, 0, 0] };
    if (q.type === 'slider') return { avg: 0 };
    if (q.type === 'text') return { texts: [] };
    return {};
  }

  private buildStats(questions: FormQuestion[], answers: FormAnswer[]): Record<string, QuestionStats> {
    const out: Record<string, QuestionStats> = {};
    for (const q of questions) out[q.id] = this.zeroStats(q);

    for (const a of answers) {
      const q = questions.find(x => x.id === a.questionId);
      if (!q) continue;

      if (q.type === 'sticker' || q.type === 'stars') {
        const idx = this.toScaleIndex(a.value);
        if (idx >= 0) out[q.id].counts![idx] = (out[q.id].counts![idx] ?? 0) + 1;
      }

      if (q.type === 'slider') {
        const val = this.toNumber(a.value);
        if (!isNaN(val)) {
          const sumKey = '__sum__' as unknown as keyof QuestionStats;
          const cntKey = '__cnt__' as unknown as keyof QuestionStats;
          // @ts-expect-error chave interna temporária
          out[q.id][sumKey] = ((out[q.id][sumKey] as number) || 0) + val;
          // @ts-expect-error chave interna temporária
          out[q.id][cntKey] = ((out[q.id][cntKey] as number) || 0) + 1;
        }
      }

      if (q.type === 'text') {
        const txt = String(a.value ?? '').trim();
        if (txt) {
          const arr = out[q.id].texts!;
          arr.push(txt);
          if (arr.length > 50) arr.shift();
        }
      }
    }

    for (const q of questions) {
      const s = out[q.id];
      if (q.type === 'slider') {
        // @ts-expect-error interno
        const sum = (s['__sum__'] as number) || 0;
        // @ts-expect-error interno
        const cnt = (s['__cnt__'] as number) || 0;
        s.avg = cnt > 0 ? +(sum / cnt).toFixed(2) : 0;
        // @ts-expect-error interno
        delete s['__sum__'];
        // @ts-expect-error interno
        delete s['__cnt__'];
      }
      if (q.type === 'text') {
        s.texts = (s.texts ?? []).slice(-5).reverse();
      }
    }

    return out;
  }

  private toScaleIndex(v: unknown): number {
    if (typeof v === 'number') {
      const n = Math.round(v);
      if (n >= 1 && n <= 5) return n - 1;
      return -1;
    }
    if (typeof v === 'string') {
      const t = v.toLowerCase().trim();
      const map: Record<string, number> = {
        'péssima': 0, 'pessima': 0, '1': 0,
        'ruim': 1,    '2': 1,
        'regular': 2, '3': 2,
        'boa': 3,     '4': 3,
        'excelente': 4, '5': 4,
      };
      if (map[t] != null) return map[t];
      const n = Math.round(Number(t.replace(',', '.')));
      if (!isNaN(n) && n >= 1 && n <= 5) return n - 1;
    }
    return -1;
  }

  private toNumber(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(',', '.'));
      if (!isNaN(n)) return n;
    }
    return NaN;
  }

  labelOf(i: number): string {
    return ['PÉSSIMA', 'RUIM', 'REGULAR', 'BOA', 'EXCELENTE'][i] || '';
  }
  emojiOf(i: number): string {
    return ['😫', '🙁', '😐', '🙂', '😄'][i] || '';
  }
}
