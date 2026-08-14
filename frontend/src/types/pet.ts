export interface Pet {
  id: string
  clientId: string
  name: string
  species: string
  breed: string | null
  birthDate: string | null
  weight: number | null
  microchipNumber: string | null
  medicalNotes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}
