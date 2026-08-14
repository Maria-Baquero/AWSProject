import { Request, Response, NextFunction } from 'express';
import * as clientService from '../services/client.service';

export async function createClient(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientService.create(req.body);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

export async function getClients(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, page } = req.query;
    if (search) {
      const clients = await clientService.search(search as string);
      res.json({ data: clients, total: clients.length, page: 1, totalPages: 1 });
    } else {
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const result = await clientService.findAll(pageNum);
      res.json(result);
    }
  } catch (err) {
    next(err);
  }
}

export async function getClientById(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientService.findById(req.params.id as string);
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function updateClient(req: Request, res: Response, next: NextFunction) {
  try {
    const client = await clientService.update(req.params.id as string, req.body);
    res.json(client);
  } catch (err) {
    next(err);
  }
}
