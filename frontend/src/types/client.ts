export interface Client {
  id: string
  fullName: string
  phone: string | null
  email: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateClientData {
  fullName: string
  phone?: string
  email?: string
  address?: string
}

export interface UpdateClientData {
  fullName?: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages: number
}
