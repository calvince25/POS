import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { stkPush } from '../services/mpesa.service';

export const initiateMpesaPayment = async (req: Request, res: Response) => {
  const { orderId, phoneNumber, amount } = req.body;
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const response = await stkPush(phoneNumber, amount, orderId);
    
    // Create a pending payment record
    await prisma.payment.create({
      data: {
        orderId,
        amount,
        method: 'MPESA',
        status: 'PENDING',
        reference: response.CheckoutRequestID,
        details: JSON.stringify({ phoneNumber }),
      },
    });

    res.status(200).json({ message: 'STK Push initiated', checkoutRequestId: response.CheckoutRequestID });
  } catch (error) {
    res.status(500).json({ message: 'Error initiating M-Pesa payment' });
  }
};

export const initiateBookingMpesaPayment = async (req: Request, res: Response) => {
  const { bookingId, phoneNumber, amount } = req.body;
  try {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const response = await stkPush(phoneNumber, amount, bookingId);
    
    // Create a pending payment record
    await prisma.payment.create({
      data: {
        bookingId,
        amount,
        method: 'MPESA',
        status: 'PENDING',
        reference: response.CheckoutRequestID,
        details: JSON.stringify({ phoneNumber }),
      },
    });

    res.status(200).json({ message: 'STK Push initiated', checkoutRequestId: response.CheckoutRequestID });
  } catch (error) {
    res.status(500).json({ message: 'Error initiating M-Pesa payment' });
  }
};

export const mpesaCallback = async (req: any, res: Response) => {
  const { Body } = req.body;
  const mpesaResponse = Body.stkCallback;
  const checkoutRequestId = mpesaResponse.CheckoutRequestID;
  const resultCode = mpesaResponse.ResultCode;
  const io = req.app.get('io');

  try {
    const payment = await prisma.payment.findFirst({ where: { reference: checkoutRequestId } });
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    if (resultCode === 0) {
      // Success
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' },
      });

      if (payment.orderId) {
        // Check if order is fully paid
        const order = await prisma.order.findUnique({
          where: { id: payment.orderId },
          include: { payments: true, table: true, waiter: { select: { name: true } } },
        });

        const totalPaid = order?.payments
          .filter((p) => p.status === 'COMPLETED')
          .reduce((acc, p) => acc + Number(p.amount), 0) || 0;

        if (totalPaid >= Number(order?.totalAmount)) {
          const updatedOrder = await prisma.order.update({
            where: { id: payment.orderId },
            data: { status: 'PAID' },
            include: { table: true, waiter: { select: { name: true } }, items: { include: { menuItem: true } } }
          });

          // Update table
          await prisma.table.update({
            where: { id: order!.tableId },
            data: { status: 'AVAILABLE' },
          });

          // Emit real-time updates
          io.emit('order_status_update', updatedOrder);
          io.emit('payment_completed', { orderId: payment.orderId, method: 'MPESA', amount: payment.amount });
        }
      } else if (payment.bookingId) {
        io.emit('payment_completed', { bookingId: payment.bookingId, method: 'MPESA', amount: payment.amount });
      }
    } else {
      // Failure
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      io.emit('payment_failed', { orderId: payment.orderId, bookingId: payment.bookingId, reason: mpesaResponse.ResultDesc });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).send('Error');
  }
};

export const processOtherPayment = async (req: Request, res: Response) => {
  const { orderId, amount, method, reference, details } = req.body;
  try {
    const payment = await prisma.payment.create({
      data: {
        orderId,
        amount,
        method: method as any,
        status: 'COMPLETED',
        reference,
        details,
      },
    });

    // Same fully paid logic as M-Pesa
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    const totalPaid = order?.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((acc, p) => acc + Number(p.amount), 0) || 0;

    if (totalPaid >= Number(order?.totalAmount)) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      await prisma.table.update({
        where: { id: order!.tableId },
        data: { status: 'AVAILABLE' },
      });
    }

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Error processing payment' });
  }
};

export const getDailyReport = async (req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const sales = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: today },
      },
      include: { order: { include: { waiter: true, items: { include: { menuItem: true } } } } },
    });

    // Aggregation logic
    const totalRevenue = sales.reduce((acc, sale) => acc + Number(sale.amount), 0);
    
    // Per Waiter
    const perWaiter: any = {};
    sales.forEach(sale => {
      const name = sale.order.waiter.name;
      perWaiter[name] = (perWaiter[name] || 0) + Number(sale.amount);
    });

    // Payment Breakdown
    const perMethod: any = {};
    sales.forEach(sale => {
      perMethod[sale.method] = (perMethod[sale.method] || 0) + Number(sale.amount);
    });

    // Most Sold Items
    const perItem: any = {};
    sales.forEach(sale => {
      sale.order.items.forEach(item => {
        const itemName = item.menuItem.name;
        perItem[itemName] = (perItem[itemName] || 0) + item.quantity;
      });
    });

    // Recent Orders
    const recentOrders = await prisma.order.findMany({
      where: { createdAt: { gte: today } },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { table: true, waiter: { select: { name: true } }, items: true }
    });

    // Total Orders Today
    const totalOrders = await prisma.order.count({
      where: { createdAt: { gte: today } }
    });

    res.status(200).json({ totalRevenue, perWaiter, perMethod, perItem, recentOrders, totalOrders });
  } catch (error) {
    res.status(500).json({ message: 'Error generating daily report' });
  }
};
