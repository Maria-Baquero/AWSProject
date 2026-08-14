import { query } from '../config/database';
import { User, UserWithoutPassword, CreateUserData, UpdateUserData } from '../types/user';

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: 'veterinarian' | 'receptionist';
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRowToUser(row: UserRow): User {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToUserWithoutPassword(row: UserRow): UserWithoutPassword {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(data: CreateUserData): Promise<UserWithoutPassword> {
  const result = await query<UserRow>(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.fullName, data.email, data.passwordHash, data.role]
  );
  return mapRowToUserWithoutPassword(result.rows[0]);
}

export async function findByEmail(email: string): Promise<User | null> {
  const result = await query<UserRow>(
    `SELECT * FROM users WHERE email = $1 AND active = true`,
    [email]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToUser(result.rows[0]);
}

export async function findById(id: string): Promise<UserWithoutPassword | null> {
  const result = await query<UserRow>(
    `SELECT * FROM users WHERE id = $1 AND active = true`,
    [id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToUserWithoutPassword(result.rows[0]);
}

export async function findAll(): Promise<UserWithoutPassword[]> {
  const result = await query<UserRow>(
    `SELECT * FROM users WHERE active = true ORDER BY full_name`
  );
  return result.rows.map(mapRowToUserWithoutPassword);
}

export async function update(id: string, data: UpdateUserData): Promise<UserWithoutPassword | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.fullName !== undefined) {
    fields.push(`full_name = $${paramIndex++}`);
    values.push(data.fullName);
  }
  if (data.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }
  if (data.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(data.role);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<UserRow>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} AND active = true RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToUserWithoutPassword(result.rows[0]);
}

export async function deactivate(id: string): Promise<UserWithoutPassword | null> {
  const result = await query<UserRow>(
    `UPDATE users SET active = false, updated_at = NOW() WHERE id = $1 AND active = true RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToUserWithoutPassword(result.rows[0]);
}
