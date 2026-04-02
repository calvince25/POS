import { Router } from 'express';
import { createOrder, updateOrderStatus, getOrdersByStatus, getMyOrders, getTables, createTable, getMyShiftSales, confirmPayment, markOrderAsUnpaid } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, createOrder);
router.patch('/:id/status', authenticate, updateOrderStatus);
router.patch('/:id/pay', authenticate, confirmPayment);
router.patch('/:id/revert-payment', authenticate, markOrderAsUnpaid);
router.get('/status/:status', authenticate, getOrdersByStatus);
router.get('/my', authenticate, getMyOrders);
router.get('/my/sales', authenticate, getMyShiftSales);

// Tables
router.get('/tables', authenticate, getTables);
router.post('/tables', authenticate, authorize(['MANAGER', 'OWNER']), createTable);

export default router;
