import api from './api'
import type { Appointment, CreateAppointmentData } from '../types/appointment'

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const response = await api.get<Appointment[]>('/appointments', {
    params: { date },
  })
  return response.data
}

export async function getAppointmentsByPet(petId: string): Promise<Appointment[]> {
  const response = await api.get<Appointment[]>('/appointments', {
    params: { petId },
  })
  return response.data
}

export async function createAppointment(data: CreateAppointmentData): Promise<Appointment> {
  const response = await api.post<Appointment>('/appointments', data)
  return response.data
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  const response = await api.patch<Appointment>(`/appointments/${id}/cancel`)
  return response.data
}

export async function completeAppointment(id: string): Promise<Appointment> {
  const response = await api.patch<Appointment>(`/appointments/${id}/complete`)
  return response.data
}
