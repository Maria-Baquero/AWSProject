import { Router } from 'express';
import { createUser, listUsers } from '../controllers/user.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { createUserSchema } from '../validators/user.validator';

const router = Router();

router.post('/', authenticate, validate(createUserSchema), createUser);
router.get('/', authenticate, listUsers);

export default router;
