import { Router } from 'express';
import { getMessages, sendMessage } from '../controllers/message.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getMessages);
router.post('/', authenticate, authorize(['MANAGER', 'OWNER']), sendMessage);

export default router;
