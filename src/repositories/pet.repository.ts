import { query } from '../config/database';
import { Pet, CreatePetData, UpdatePetData } from '../types/pet';
import { NotFoundError } from '../errors';

interface PetRow {
  id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  weight: number | null;
  microchip_number: string | null;
  medical_notes: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRowToPet(row: PetRow): Pet {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    birthDate: row.birth_date,
    weight: row.weight !== null ? Number(row.weight) : null,
    microchipNumber: row.microchip_number,
    medicalNotes: row.medical_notes,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create(data: CreatePetData): Promise<Pet> {
  // Verify that the client exists
  const clientResult = await query(
    `SELECT id FROM clients WHERE id = $1`,
    [data.clientId]
  );

  if (clientResult.rows.length === 0) {
    throw new NotFoundError('Cliente', data.clientId);
  }

  const result = await query<PetRow>(
    `INSERT INTO pets (client_id, name, species, breed, birth_date, weight, microchip_number, medical_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.clientId,
      data.name,
      data.species,
      data.breed || null,
      data.birthDate || null,
      data.weight || null,
      data.microchipNumber !== undefined ? data.microchipNumber : null,
      data.medicalNotes || null,
    ]
  );

  return mapRowToPet(result.rows[0]);
}

export async function findByClient(clientId: string): Promise<Pet[]> {
  const result = await query<PetRow>(
    `SELECT * FROM pets WHERE client_id = $1 AND active = true ORDER BY name`,
    [clientId]
  );
  return result.rows.map(mapRowToPet);
}

export async function findById(id: string): Promise<Pet | null> {
  const result = await query<PetRow>(
    `SELECT * FROM pets WHERE id = $1 AND active = true`,
    [id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToPet(result.rows[0]);
}

export async function update(id: string, data: UpdatePetData): Promise<Pet | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.species !== undefined) {
    fields.push(`species = $${paramIndex++}`);
    values.push(data.species);
  }
  if (data.breed !== undefined) {
    fields.push(`breed = $${paramIndex++}`);
    values.push(data.breed);
  }
  if (data.birthDate !== undefined) {
    fields.push(`birth_date = $${paramIndex++}`);
    values.push(data.birthDate);
  }
  if (data.weight !== undefined) {
    fields.push(`weight = $${paramIndex++}`);
    values.push(data.weight);
  }
  if (data.microchipNumber !== undefined) {
    fields.push(`microchip_number = $${paramIndex++}`);
    values.push(data.microchipNumber);
  }
  if (data.medicalNotes !== undefined) {
    fields.push(`medical_notes = $${paramIndex++}`);
    values.push(data.medicalNotes);
  }

  if (fields.length === 0) {
    return findById(id);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await query<PetRow>(
    `UPDATE pets SET ${fields.join(', ')} WHERE id = $${paramIndex} AND active = true RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToPet(result.rows[0]);
}

export async function deactivate(id: string): Promise<Pet | null> {
  const result = await query<PetRow>(
    `UPDATE pets SET active = false, updated_at = NOW() WHERE id = $1 AND active = true RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) {
    return null;
  }
  return mapRowToPet(result.rows[0]);
}
