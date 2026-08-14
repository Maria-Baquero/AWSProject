export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'veterinarian' | 'receptionist';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithoutPassword {
  id: string;
  fullName: string;
  email: string;
  role: 'veterinarian' | 'receptionist';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'veterinarian' | 'receptionist';
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  role?: 'veterinarian' | 'receptionist';
}
