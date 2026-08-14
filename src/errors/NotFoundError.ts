import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource} con identificador '${id}' no fue encontrado`);
  }
}
