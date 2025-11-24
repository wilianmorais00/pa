import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { FormsService } from '../../Service/forms-service';

type QuestionType = 'sticker' | 'slider' | 'text' | 'stars';

type QuestionFormGroup = FormGroup<{
  id: FormControl<string>;
  prompt: FormControl<string>;
  type: FormControl<QuestionType>;
  required: FormControl<boolean>;
}>;

@Component({
  selector: 'app-forms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './formscomponent.html',
  styleUrls: ['./formscomponent.css'],
})
export class FormsComponent {
  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);
  private formsService = inject(FormsService);

  form = this.fb.group({
    title: this.fb.control('', { validators: [Validators.required, Validators.minLength(3)] }),
    description: [''], 
    questions: this.fb.array<QuestionFormGroup>([])
  });

  flashMsg: string | null = null;
  flashKind: 'success' | 'info' | 'danger' = 'success';
  private flashTimer: any;

  private showFlash(msg: string, kind: 'success' | 'info' | 'danger' = 'success') {
    this.flashMsg = msg;
    this.flashKind = kind;
    if (this.flashTimer) clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => (this.flashMsg = null), 3500);
  }

  get questions(): FormArray<QuestionFormGroup> {
    return this.form.get('questions') as FormArray<QuestionFormGroup>;
  }

  ngOnInit() {
    if (this.questions.length === 0) this.addQuestion();
  }

  private newQuestionGroup(): QuestionFormGroup {
    return this.fb.group({
      id: this.fb.control(this.uuid()),
      prompt: this.fb.control('', { validators: [Validators.required, Validators.minLength(3)] }),
      type: this.fb.control<QuestionType>('sticker'),
      required: this.fb.control(false)
    });
  }

  addQuestion() {
    this.questions.push(this.newQuestionGroup());
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
  }

  drop(event: CdkDragDrop<QuestionFormGroup[]>) {
    if (event.previousIndex === event.currentIndex) return;
    moveItemInArray(this.questions.controls, event.previousIndex, event.currentIndex);
    this.questions.updateValueAndValidity();
  }

  setType(index: number, type: string) {
    this.questions.at(index).controls.type.setValue(type as QuestionType);
  }

  trackById = (_: number, group: QuestionFormGroup) => group.controls.id.value;

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      title: this.form.controls.title.value,
      description: this.form.controls.description.value, // 👈 passa a descrição
      questions: this.questions.controls.map((q, order) => ({
        id: q.controls.id.value,
        prompt: q.controls.prompt.value,
        type: q.controls.type.value,
        order,
        required: q.controls.required.value
      }))
    };

    const created = this.formsService.addTemplate(payload);
    this.showFlash(`Formulário ${created.title} criado e disponível para atribuir a hóspedes.`, 'success');
  }

  cancel() {
    this.router.navigate(['/home']);
  }

  private uuid(): string {
    try { return crypto.randomUUID(); }
    catch { return Math.random().toString(36).slice(2); }
  }
}
