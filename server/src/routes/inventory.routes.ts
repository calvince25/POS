import { Router } from 'express';
import { getInventory, updateInventory, replenishInventory, deleteInventory, createInventoryItem } from '../controllers/inventory.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getInventory);
router.post('/', authenticate, authorize(['MANAGER', 'OWNER']), createInventoryItem);
router.patch('/:id', authenticate, authorize(['MANAGER', 'OWNER']), updateInventory);
router.post('/replenish', authenticate, authorize(['MANAGER', 'OWNER']), replenishInventory);
router.post('/replenish/:menuItemId', authenticate, authorize(['MANAGER', 'OWNER']), replenishInventory);
router.delete('/:id', authenticate, authorize(['MANAGER', 'OWNER']), deleteInventory);

export default router;
