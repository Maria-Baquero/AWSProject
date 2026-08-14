import { AppError } from './AppError';

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Credenciales inválidas o token expirado') {
    super(401, message);
  }
}
