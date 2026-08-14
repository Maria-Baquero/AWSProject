export interface User {
  id: string
  fullName: string
  email: string
  role: 'veterinarian' | 'receptionist'
}

export interface LoginResponse {
  token: string
  refreshToken: string
  user: User
}

export interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}
