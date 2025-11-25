export type QuestionType = 'sticker' | 'slider' | 'text' | 'stars';

export interface FormQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  order: number;
  required?: boolean;
}

export interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  createdAt: string;    
  questions: FormQuestion[];
  totalAnswers: number;
  lastAnswerAt: string;   
}