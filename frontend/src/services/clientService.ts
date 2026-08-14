import api from './api'
import type { Client, CreateClientData, UpdateClientData, PaginatedResponse } from '../types/client'

export async function getClients(page: number = 1, search: string = ''): Promise<PaginatedResponse<Client>> {
  const params: Record<string, string | number> = { page }
  if (search.trim()) {
    params.search = search.trim()
  }
  const response = await api.get<PaginatedResponse<Client>>('/clients', { params })
  return response.data
}

export async function getClientById(id: string): Promise<Client> {
  const response = await api.get<Client>(`/clients/${id}`)
  return response.data
}

export async function createClient(data: CreateClientData): Promise<Client> {
  const response = await api.post<Client>('/clients', data)
  return response.data
}

export async function updateClient(id: string, data: UpdateClientData): Promise<Client> {
  const response = await api.put<Client>(`/clients/${id}`, data)
  return response.data
}
