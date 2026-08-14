import { query } from '../config/database';
import { Client, CreateClientData, UpdateClientData } from '../types/client';

interface ClientRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRowToClient(row: ClientRow): Client {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(data: CreateClientData): Promise<Client> {
  const result = await query<ClientRow>(
    `INSERT INTO clients (full_name, phone, email, address)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.fullName, data.phone || null, data.email || null, data.address || null]
  );
  return mapRowToClient(result.rows[0]);
}

export async function findAll(page: number): Promise<{ data: Client[]; total: number; page: number; totalPages: number }> {
  const limit = 50;
  const offset = (page - 1) * limit;

  const countResult = await query<{ total: string }>('SELECT COUNT(*) AS total FROM clients');
  const total = parseInt(countResult.rows[0].total, 10);

  const result = await query<ClientRow>(
    `SELECT * FROM clients ORDER BY full_name LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    data: result.rows.map(mapRowToClient),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function search(term: string): Promise<Client[]> {
  const result = await query<ClientRow>(
    `SELECT * FROM clients
     WHERE full_name ILIKE $1 OR phone ILIKE $1
     ORDER BY full_name
     LIMIT 50`,
    [`%${term}%`]
  );
  return result.rows.map(mapRowToClient);
}

export async function findById(id: string): Promise<Client | null> {
  const result = await query<ClientRow>(
    `SELECT * FROM clients WHERE id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToClient(result.rows[0]);
}

export async function update(id: string, data: UpdateClientData): Promise<Client | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.fullName !== undefined) {
    fields.push(`full_name = $${paramIndex++}`);
    values.push(data.fullName);
  }
  if (data.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(data.phone);
  }
  if (data.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }
  if (data.address !== undefined) {
    fields.push(`address = $${paramIndex++}`);
    values.push(data.address);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<ClientRow>(
    `UPDATE clients SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToClient(result.rows[0]);
}

export async function findByEmail(email: string): Promise<Client | null> {
  const result = await query<ClientRow>(
    `SELECT * FROM clients WHERE email = $1`,
    [email]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToClient(result.rows[0]);
}

export async function findByPhone(phone: string): Promise<Client | null> {
  const result = await query<ClientRow>(
    `SELECT * FROM clients WHERE phone = $1`,
    [phone]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToClient(result.rows[0]);
}
