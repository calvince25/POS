import { Router } from 'express';
import { getInventory, updateInventory, replenishInventory, deleteInventory } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getInventory);
router.patch('/:id', authenticate, authorize(['MANAGER', 'OWNER']), updateInventory);
router.post('/replenish/:menuItemId', authenticate, authorize(['MANAGER', 'OWNER']), replenishInventory);
router.delete('/:id', authenticate, authorize(['MANAGER', 'OWNER']), deleteInventory);

export default router;
