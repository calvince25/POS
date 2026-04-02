import { Router } from 'express';
import * as roomController from '../controllers/room.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Reporting (MUST come before /:id routes to avoid conflict)
router.get('/report', authenticate, authorize(['MANAGER', 'OWNER']), roomController.getLodgingReport);

// Read - both manager and receptionist
router.get('/', authenticate, authorize(['MANAGER', 'RECEPTIONIST', 'OWNER']), roomController.getAllRooms);
router.get('/bookings', authenticate, authorize(['MANAGER', 'RECEPTIONIST', 'OWNER']), roomController.getBookings);

// Create / Update bookings - both roles
router.post('/bookings', authenticate, authorize(['MANAGER', 'RECEPTIONIST', 'OWNER']), roomController.createBooking);
router.patch('/bookings/:id/status', authenticate, authorize(['MANAGER', 'RECEPTIONIST', 'OWNER']), roomController.updateBookingStatus);

// Room management - manager/owner only (MUST come after /bookings routes)
router.post('/', authenticate, authorize(['MANAGER', 'OWNER']), roomController.createRoom);
router.patch('/:id/status', authenticate, authorize(['MANAGER', 'RECEPTIONIST', 'OWNER']), roomController.updateRoomStatus);
router.patch('/:id', authenticate, authorize(['MANAGER', 'OWNER']), roomController.updateRoom);
router.delete('/:id', authenticate, authorize(['MANAGER', 'OWNER']), roomController.deleteRoom);

export default router;
