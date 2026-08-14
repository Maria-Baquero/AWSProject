import { Router } from 'express';
import { createPet, getPets, getAllPets, getPetById, updatePet, deletePet } from '../controllers/pet.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { createPetSchema, updatePetSchema } from '../validators/pet.validator';

const router = Router();

router.post('/', authenticate, validate(createPetSchema), createPet);
router.get('/', authenticate, getPets);
router.get('/all', authenticate, getAllPets);
router.get('/:id', authenticate, getPetById);
router.put('/:id', authenticate, validate(updatePetSchema), updatePet);
router.delete('/:id', authenticate, deletePet);

export default router;
