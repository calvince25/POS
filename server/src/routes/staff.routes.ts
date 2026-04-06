import { Router } from 'express';
import { getAllStaff, updateStaffStatus, resetStaffPassword, updateStaffRole, getShifts, createShift, updateShift, getMyShifts, deleteStaff } from '../controllers/staff.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getAllStaff);
router.patch('/:id/status', authenticate, authorize(['MANAGER', 'OWNER']), updateStaffStatus);
router.patch('/:id/reset-password', authenticate, authorize(['MANAGER', 'OWNER']), resetStaffPassword);
router.patch('/:id/role', authenticate, authorize(['MANAGER', 'OWNER']), updateStaffRole);
router.delete('/:id', authenticate, authorize(['OWNER']), deleteStaff);

router.get('/shifts', authenticate, getShifts);
router.post('/shifts', authenticate, authorize(['MANAGER', 'OWNER']), createShift);
router.put('/shifts/:id', authenticate, authorize(['MANAGER', 'OWNER']), updateShift);
router.get('/shifts/my', authenticate, getMyShifts);

export default router;
