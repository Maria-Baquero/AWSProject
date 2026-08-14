import api from './api'
import type { Pet } from '../types/pet'

export type { Pet }

export interface CreatePetDTO {
  clientId: string
  name: string
  species: string
  breed?: string
  birthDate?: string
  weight?: number
  microchipNumber?: string | null
  medicalNotes?: string
}

export interface UpdatePetDTO {
  name?: string
  species?: string
  breed?: string | null
  birthDate?: string | null
  weight?: number | null
  microchipNumber?: string | null
  medicalNotes?: string | null
}

interface PetsResponse {
  data: (Pet & { client?: { fullName: string } })[]
  total: number
  page: number
  totalPages: number
}

export async function getAllPets(): Promise<Pet[]> {
  const response = await api.get<Pet[]>('/pets/all')
  return response.data
}

export async function getPets(params: {
  search?: string
  page?: number
  limit?: number
}): Promise<PetsResponse> {
  const response = await api.get<PetsResponse>('/pets', { params })
  return response.data
}

export async function getPetsByClient(clientId: string): Promise<Pet[]> {
  const response = await api.get<Pet[]>('/pets', {
    params: { clientId },
  })
  return response.data
}

export async function createPet(data: CreatePetDTO): Promise<Pet> {
  const response = await api.post<Pet>('/pets', data)
  return response.data
}

export async function updatePet(id: string, data: UpdatePetDTO): Promise<Pet> {
  const response = await api.put<Pet>(`/pets/${id}`, data)
  return response.data
}

export async function deletePet(id: string): Promise<void> {
  await api.delete(`/pets/${id}`)
}

export interface ClientOption {
  id: string
  fullName: string
}

export async function getClients(): Promise<ClientOption[]> {
  const response = await api.get<{ data: ClientOption[] } | ClientOption[]>('/clients')
  const result = response.data
  // Handle both paginated response {data: [...]} and plain array [...]
  return Array.isArray(result) ? result : result.data
}
