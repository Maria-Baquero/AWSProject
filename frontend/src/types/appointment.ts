export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  petId: string
  petName?: string
  clientName?: string
  date: string
  startTime: string
  durationMinutes: number
  reason: string
  status: AppointmentStatus
  createdAt: string
  updatedAt: string
}

export interface CreateAppointmentData {
  petId: string
  date: string
  time: string
  reason: string
  duration: number
}
