import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as clientService from '../../../src/services/client.service';
import * as clientRepository from '../../../src/repositories/client.repository';
import { ConflictError, NotFoundError } from '../../../src/errors';

vi.mock('../../../src/repositories/client.repository');

const mockClient = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  fullName: 'María García López',
  phone: '+5491155551234',
  email: 'maria@example.com',
  address: 'Calle Falsa 123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockClient2 = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  fullName: 'Juan Pérez',
  phone: '+5491155555678',
  email: 'juan@example.com',
  address: 'Av. Siempreviva 742',
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
};

describe('ClientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a client when email and phone are unique', async () => {
      vi.mocked(clientRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(clientRepository.findByPhone).mockResolvedValue(null);
      vi.mocked(clientRepository.create).mockResolvedValue(mockClient);

      const result = await clientService.create({
        fullName: 'María García López',
        phone: '+5491155551234',
        email: 'maria@example.com',
        address: 'Calle Falsa 123',
      });

      expect(result).toEqual(mockClient);
      expect(clientRepository.findByEmail).toHaveBeenCalledWith('maria@example.com');
      expect(clientRepository.findByPhone).toHaveBeenCalledWith('+5491155551234');
      expect(clientRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictError when email already exists', async () => {
      vi.mocked(clientRepository.findByEmail).mockResolvedValue(mockClient);

      await expect(clientService.create({
        fullName: 'Otro Cliente',
        email: 'maria@example.com',
        phone: '+5491100001111',
      })).rejects.toThrow(ConflictError);

      await expect(clientService.create({
        fullName: 'Otro Cliente',
        email: 'maria@example.com',
        phone: '+5491100001111',
      })).rejects.toThrow('El correo electrónico ya está registrado para otro cliente');

      expect(clientRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when phone already exists', async () => {
      vi.mocked(clientRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(clientRepository.findByPhone).mockResolvedValue(mockClient);

      await expect(clientService.create({
        fullName: 'Otro Cliente',
        email: 'nuevo@example.com',
        phone: '+5491155551234',
      })).rejects.toThrow(ConflictError);

      await expect(clientService.create({
        fullName: 'Otro Cliente',
        email: 'nuevo@example.com',
        phone: '+5491155551234',
      })).rejects.toThrow('El teléfono ya está registrado para otro cliente');

      expect(clientRepository.create).not.toHaveBeenCalled();
    });

    it('should skip email check when email is not provided', async () => {
      vi.mocked(clientRepository.findByPhone).mockResolvedValue(null);
      vi.mocked(clientRepository.create).mockResolvedValue({ ...mockClient, email: null });

      await clientService.create({
        fullName: 'María García',
        phone: '+5491155551234',
      });

      expect(clientRepository.findByEmail).not.toHaveBeenCalled();
      expect(clientRepository.findByPhone).toHaveBeenCalledWith('+5491155551234');
      expect(clientRepository.create).toHaveBeenCalled();
    });

    it('should skip phone check when phone is not provided', async () => {
      vi.mocked(clientRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(clientRepository.create).mockResolvedValue({ ...mockClient, phone: null });

      await clientService.create({
        fullName: 'María García',
        email: 'maria@example.com',
      });

      expect(clientRepository.findByEmail).toHaveBeenCalledWith('maria@example.com');
      expect(clientRepository.findByPhone).not.toHaveBeenCalled();
      expect(clientRepository.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated clients with default page 1', async () => {
      vi.mocked(clientRepository.findAll).mockResolvedValue([mockClient]);

      const result = await clientService.findAll();

      expect(result).toEqual([mockClient]);
      expect(clientRepository.findAll).toHaveBeenCalledWith(1);
    });

    it('should pass the page number to the repository', async () => {
      vi.mocked(clientRepository.findAll).mockResolvedValue([]);

      await clientService.findAll(3);

      expect(clientRepository.findAll).toHaveBeenCalledWith(3);
    });
  });

  describe('search', () => {
    it('should return matching clients from the repository', async () => {
      vi.mocked(clientRepository.search).mockResolvedValue([mockClient]);

      const result = await clientService.search('María');

      expect(result).toEqual([mockClient]);
      expect(clientRepository.search).toHaveBeenCalledWith('María');
    });

    it('should return empty array when no matches found', async () => {
      vi.mocked(clientRepository.search).mockResolvedValue([]);

      const result = await clientService.search('NoExiste');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return client when found', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(mockClient);

      const result = await clientService.findById(mockClient.id);

      expect(result).toEqual(mockClient);
    });

    it('should throw NotFoundError when client does not exist', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(null);

      await expect(clientService.findById('nonexistent-id'))
        .rejects.toThrow(NotFoundError);

      await expect(clientService.findById('nonexistent-id'))
        .rejects.toThrow("Cliente con identificador 'nonexistent-id' no fue encontrado");
    });
  });

  describe('update', () => {
    it('should update client when it exists and data is unique', async () => {
      const updatedClient = { ...mockClient, fullName: 'María García Actualizada' };
      vi.mocked(clientRepository.findById).mockResolvedValue(mockClient);
      vi.mocked(clientRepository.update).mockResolvedValue(updatedClient);

      const result = await clientService.update(mockClient.id, { fullName: 'María García Actualizada' });

      expect(result.fullName).toBe('María García Actualizada');
    });

    it('should throw NotFoundError when client does not exist', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(null);

      await expect(clientService.update('nonexistent-id', { fullName: 'Nuevo' }))
        .rejects.toThrow(NotFoundError);

      expect(clientRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updating email to the same value (own email)', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(mockClient);
      vi.mocked(clientRepository.findByEmail).mockResolvedValue(mockClient); // same client
      vi.mocked(clientRepository.update).mockResolvedValue(mockClient);

      const result = await clientService.update(mockClient.id, { email: 'maria@example.com' });

      expect(result).toEqual(mockClient);
    });

    it('should throw ConflictError when email belongs to another client', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(mockClient);
      vi.mocked(clientRepository.findByEmail).mockResolvedValue(mockClient2); // different client

      await expect(clientService.update(mockClient.id, { email: 'juan@example.com' }))
        .rejects.toThrow(ConflictError);

      await expect(clientService.update(mockClient.id, { email: 'juan@example.com' }))
        .rejects.toThrow('El correo electrónico ya está registrado para otro cliente');

      expect(clientRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updating phone to the same value (own phone)', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(mockClient);
      vi.mocked(clientRepository.findByPhone).mockResolvedValue(mockClient); // same client
      vi.mocked(clientRepository.update).mockResolvedValue(mockClient);

      const result = await clientService.update(mockClient.id, { phone: '+5491155551234' });

      expect(result).toEqual(mockClient);
    });

    it('should throw ConflictError when phone belongs to another client', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(mockClient);
      vi.mocked(clientRepository.findByPhone).mockResolvedValue(mockClient2); // different client

      await expect(clientService.update(mockClient.id, { phone: '+5491155555678' }))
        .rejects.toThrow(ConflictError);

      await expect(clientService.update(mockClient.id, { phone: '+5491155555678' }))
        .rejects.toThrow('El teléfono ya está registrado para otro cliente');

      expect(clientRepository.update).not.toHaveBeenCalled();
    });

    it('should skip email uniqueness check when email is not in update data', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(mockClient);
      vi.mocked(clientRepository.update).mockResolvedValue({ ...mockClient, fullName: 'Nombre Nuevo' });

      await clientService.update(mockClient.id, { fullName: 'Nombre Nuevo' });

      expect(clientRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('should skip phone uniqueness check when phone is not in update data', async () => {
      vi.mocked(clientRepository.findById).mockResolvedValue(mockClient);
      vi.mocked(clientRepository.update).mockResolvedValue({ ...mockClient, fullName: 'Nombre Nuevo' });

      await clientService.update(mockClient.id, { fullName: 'Nombre Nuevo' });

      expect(clientRepository.findByPhone).not.toHaveBeenCalled();
    });
  });
});
