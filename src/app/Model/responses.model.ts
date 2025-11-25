export interface FormAnswer {
  id: string;         
  formId: string;        
  questionId: string;   
  value: string | number | boolean | null;
  answeredAt: string;   
}