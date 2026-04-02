import { Router } from 'express';
import { getKitchenAnalytics } from '../controllers/kitchen.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/analytics', authenticate, getKitchenAnalytics);

export default router;
