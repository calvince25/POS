import { Router } from 'express';
import { login, register, getCurrentUser } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/register', authenticate, register); // Registering should probably be restricted to manager
router.get('/me', authenticate, getCurrentUser);

export default router;
