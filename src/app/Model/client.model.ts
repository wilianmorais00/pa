export interface Client {
  id: string;  
  name: string;
  email: string;
  phone: string;
  room: string;  
  checkin: string;  
  checkout: string;  
  assignedFormId?: string | null; 
}