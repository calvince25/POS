import { Router } from 'express';
import { initiateMpesaPayment, mpesaCallback, processOtherPayment, getDailyReport, initiateBookingMpesaPayment } from '../controllers/payment.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.post('/mpesa/initiate', authenticate, initiateMpesaPayment);
router.post('/mpesa/booking/initiate', authenticate, initiateBookingMpesaPayment);
router.post('/mpesa/callback', mpesaCallback);
router.post('/process', authenticate, processOtherPayment);
router.get('/reports/daily', authenticate, authorize(['MANAGER', 'OWNER']), getDailyReport);

export default router;
