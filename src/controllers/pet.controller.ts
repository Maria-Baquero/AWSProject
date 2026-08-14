import { Request, Response, NextFunction } from 'express';
import * as petService from '../services/pet.service';
import { query } from '../config/database';

export async function createPet(req: Request, res: Response, next: NextFunction) {
  try {
    const pet = await petService.create(req.body);
    res.status(201).json(pet);
  } catch (err) {
    next(err);
  }
}

export async function getPets(req: Request, res: Response, next: NextFunction) {
  try {
    const { clientId, search, page, limit } = req.query;

    // If clientId provided, return pets for that client (array)
    if (clientId) {
      const pets = await petService.findByClient(clientId as string);
      res.json(pets);
      return;
    }

    // Paginated list with optional search
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    const offset = (pageNum - 1) * limitNum;
    const searchTerm = search ? (search as string).trim() : '';

    let countQuery: string;
    let dataQuery: string;
    let params: any[];

    if (searchTerm) {
      const pattern = `%${searchTerm}%`;
      countQuery = `SELECT COUNT(*) FROM pets p JOIN clients c ON p.client_id = c.id WHERE p.active = true AND (p.name ILIKE $1 OR p.species ILIKE $1 OR p.breed ILIKE $1)`;
      dataQuery = `SELECT p.*, json_build_object('fullName', c.full_name) as client FROM pets p JOIN clients c ON p.client_id = c.id WHERE p.active = true AND (p.name ILIKE $1 OR p.species ILIKE $1 OR p.breed ILIKE $1) ORDER BY p.name LIMIT $2 OFFSET $3`;
      params = [pattern, limitNum, offset];
    } else {
      countQuery = `SELECT COUNT(*) FROM pets WHERE active = true`;
      dataQuery = `SELECT p.*, json_build_object('fullName', c.full_name) as client FROM pets p JOIN clients c ON p.client_id = c.id WHERE p.active = true ORDER BY p.name LIMIT $1 OFFSET $2`;
      params = [limitNum, offset];
    }

    const countResult = await query<{ count: string }>(searchTerm ? countQuery : countQuery, searchTerm ? [params[0]] : []);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(dataQuery, params);

    const data = dataResult.rows.map((row: any) => ({
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
      client: row.client,
    }));

    res.json({ data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

export async function getAllPets(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `SELECT p.*, json_build_object('fullName', c.full_name) as client FROM pets p JOIN clients c ON p.client_id = c.id WHERE p.active = true ORDER BY p.name`
    );
    const pets = result.rows.map((row: any) => ({
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
      client: row.client,
    }));
    res.json(pets);
  } catch (err) {
    next(err);
  }
}

export async function getPetById(req: Request, res: Response, next: NextFunction) {
  try {
    const pet = await petService.findById(req.params.id as string);
    res.json(pet);
  } catch (err) {
    next(err);
  }
}

export async function updatePet(req: Request, res: Response, next: NextFunction) {
  try {
    const pet = await petService.update(req.params.id as string, req.body);
    res.json(pet);
  } catch (err) {
    next(err);
  }
}

export async function deletePet(req: Request, res: Response, next: NextFunction) {
  try {
    await petService.deactivate(req.params.id as string);
    res.status(200).json({ message: 'Mascota desactivada exitosamente' });
  } catch (err) {
    next(err);
  }
}
