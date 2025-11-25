import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormsService } from '../../Service/forms-service';

type BlockType = 'sticker' | 'bar' | 'stars' | 'text';

interface Block {
  id: string;
  type: BlockType;
  title: string;
  required: boolean; 
}

@Component({
  selector: 'app-public-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publicform-component.html',
  styleUrls: ['./publicform-component.css'],
})
export class PublicFormComponent {
  brand = 'QuestIO';
  hotel = new URLSearchParams(location.search).get('hotel') ?? 'HOTEL AB';
  formTitle = '';
  formDescription = '';

  private formsSvc = inject(FormsService);

  blocks: Block[] = [];
  answers: Record<string, any> = {};

  mode: 'form' | 'review' | 'done' = 'form';
  idx = 0;
  doneAt = '';
  requiredError = false;

  constructor() {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const qParam = params.get('q');

    if (id) {
      const tpl = this.formsSvc.getById(id);
      if (tpl) {
        this.formTitle = tpl.title || this.hotel;
        this.formDescription = tpl.description || '';
        this.blocks = (tpl.questions || []).map(q => ({
          id: q.id,
          type: (q.type === 'slider' ? 'bar' : q.type) as BlockType,
          title: q.prompt || 'COMO VOCÊ AVALIA SUA ESTADIA',
          required: !!q.required, 
        }));
      }
    }

    if (!this.formTitle) {
      this.formTitle = this.hotel;
    }

    if (this.blocks.length === 0) {
      const queryQ = (qParam ?? 'sticker,bar,stars,text,sticker')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean) as BlockType[];

      this.blocks = queryQ.map((t, i) => ({
        id: `q${i + 1}`,
        type: (['sticker', 'bar', 'stars', 'text'].includes(t) ? t : 'sticker') as BlockType,
        title: 'COMO VOCÊ AVALIA SUA ESTADIA',
        required: false, 
      }));
    }
  }

  get current(): Block | null {
    return this.mode === 'form' ? this.blocks[this.idx] ?? null : null;
  }

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

  finish() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    this.doneAt = `${dd}/${mm}/${yyyy}`;
    this.mode = 'done';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
