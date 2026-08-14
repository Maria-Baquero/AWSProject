export interface Appointment {
  id: string;
  petId: string;
  createdBy: string | null;
  date: string;
  startTime: string;
  durationMinutes: number;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  petName?: string;
  clientName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentData {
  petId: string;
  createdBy?: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  reason: string;
}
