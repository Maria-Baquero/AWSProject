import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pg module
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockOn = vi.fn();
const MockPool = vi.fn(() => ({
  query: mockQuery,
  connect: mockConnect,
  on: mockOn
}));

vi.mock('pg', () => ({
  Pool: MockPool
}));

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
  config: vi.fn()
}));

describe('Database Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('query', () => {
    it('should execute a query successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });

      const { query } = await import('../../../src/config/database');
      const result = await query('SELECT * FROM users WHERE id = $1', ['1']);

      expect(result.rows).toEqual([{ id: 1 }]);
      expect(result.rowCount).toBe(1);
    });

    it('should throw ServiceUnavailableError on ECONNREFUSED', async () => {
      const connectionError = new Error('connect ECONNREFUSED');
      (connectionError as any).code = 'ECONNREFUSED';
      mockQuery.mockRejectedValueOnce(connectionError);

      const { query } = await import('../../../src/config/database');

      await expect(query('SELECT 1')).rejects.toMatchObject({
        statusCode: 503,
        message: 'El servicio no está disponible temporalmente'
      });
    });

    it('should throw ServiceUnavailableError on ETIMEDOUT', async () => {
      const timeoutError = new Error('Connection timed out');
      (timeoutError as any).code = 'ETIMEDOUT';
      mockQuery.mockRejectedValueOnce(timeoutError);

      const { query } = await import('../../../src/config/database');

      await expect(query('SELECT 1')).rejects.toMatchObject({
        statusCode: 503,
        message: 'El servicio no está disponible temporalmente'
      });
    });

    it('should throw ServiceUnavailableError when message contains timeout', async () => {
      const timeoutError = new Error('timeout expired');
      mockQuery.mockRejectedValueOnce(timeoutError);

      const { query } = await import('../../../src/config/database');

      await expect(query('SELECT 1')).rejects.toMatchObject({
        statusCode: 503,
        message: 'El servicio no está disponible temporalmente'
      });
    });

    it('should throw ServiceUnavailableError on Connection terminated', async () => {
      const terminatedError = new Error('Connection terminated unexpectedly');
      mockQuery.mockRejectedValueOnce(terminatedError);

      const { query } = await import('../../../src/config/database');

      await expect(query('SELECT 1')).rejects.toMatchObject({
        statusCode: 503,
        message: 'El servicio no está disponible temporalmente'
      });
    });

    it('should rethrow non-connection errors as-is', async () => {
      const sqlError = new Error('relation "users" does not exist');
      (sqlError as any).code = '42P01';
      mockQuery.mockRejectedValueOnce(sqlError);

      const { query } = await import('../../../src/config/database');

      await expect(query('SELECT * FROM users')).rejects.toThrow('relation "users" does not exist');
    });
  });

  describe('getClient', () => {
    it('should return a pool client on success', async () => {
      const mockClient = { release: vi.fn(), query: vi.fn() };
      mockConnect.mockResolvedValueOnce(mockClient);

      const { getClient } = await import('../../../src/config/database');
      const client = await getClient();

      expect(client).toBe(mockClient);
    });

    it('should throw ServiceUnavailableError on connection failure', async () => {
      const connectionError = new Error('connect ECONNREFUSED');
      (connectionError as any).code = 'ECONNREFUSED';
      mockConnect.mockRejectedValueOnce(connectionError);

      const { getClient } = await import('../../../src/config/database');

      await expect(getClient()).rejects.toMatchObject({
        statusCode: 503,
        message: 'El servicio no está disponible temporalmente'
      });
    });

    it('should throw ServiceUnavailableError on timeout', async () => {
      const timeoutError = new Error('timeout expired');
      mockConnect.mockRejectedValueOnce(timeoutError);

      const { getClient } = await import('../../../src/config/database');

      await expect(getClient()).rejects.toMatchObject({
        statusCode: 503,
        message: 'El servicio no está disponible temporalmente'
      });
    });

    it('should rethrow non-connection errors as-is', async () => {
      const authError = new Error('password authentication failed');
      (authError as any).code = '28P01';
      mockConnect.mockRejectedValueOnce(authError);

      const { getClient } = await import('../../../src/config/database');

      await expect(getClient()).rejects.toThrow('password authentication failed');
    });
  });

  describe('Pool Configuration', () => {
    it('should create pool with connectionTimeoutMillis of 5000', async () => {
      await import('../../../src/config/database');

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionTimeoutMillis: 5000
        })
      );
    });

    it('should read configuration from environment variables', async () => {
      await import('../../../src/config/database');

      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: process.env.DB_HOST,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD
        })
      );
    });

    it('should register an error handler on the pool', async () => {
      await import('../../../src/config/database');

      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});
