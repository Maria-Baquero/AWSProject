export interface Pet {
  id: string;
  clientId: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  weight: number | null;
  microchipNumber: string | null;
  medicalNotes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePetData {
  clientId: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  weight?: number;
  microchipNumber?: string | null;
  medicalNotes?: string;
}

export interface UpdatePetData {
  name?: string;
  species?: string;
  breed?: string | null;
  birthDate?: string | null;
  weight?: number | null;
  microchipNumber?: string | null;
  medicalNotes?: string | null;
}
