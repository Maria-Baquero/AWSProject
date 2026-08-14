import { Router } from 'express';
import { createClient, getClients, getClientById, updateClient } from '../controllers/client.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { createClientSchema, updateClientSchema } from '../validators/client.validator';

const router = Router();

router.post('/', authenticate, validate(createClientSchema), createClient);
router.get('/', authenticate, getClients);
router.get('/:id', authenticate, getClientById);
router.put('/:id', authenticate, validate(updateClientSchema), updateClient);

export default router;
