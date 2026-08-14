import { AppError } from './AppError';

export class ServiceUnavailableError extends AppError {
  constructor() {
    super(503, 'El servicio no está disponible temporalmente');
  }
}
