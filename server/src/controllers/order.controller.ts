import { Request, Response } from 'express';
import prisma from '../services/prisma';

export const createOrder = async (req: any, res: Response) => {
  const { tableId, items } = req.body; // items: Array<{ menuItemId: string, quantity: number, price: number }>
  const waiterId = req.user.id;
  const io = req.app.get('io');

  try {
    // 1. Calculate total (including modifiers)
    const totalAmount = items.reduce((acc: number, item: any) => {
      const itemBase = item.price * item.quantity;
      const modsTotal = (item.selectedModifiers || []).reduce((mAcc: number, m: any) => mAcc + m.price, 0) * item.quantity;
      return acc + itemBase + modsTotal;
    }, 0);

    // 2. Transaction to create order and orderItems
    const order = await prisma.order.create({
      data: {
        waiterId,
        tableId,
        totalAmount,
        status: 'PENDING',
        items: {
          create: items.map((item: any) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: item.price,
            selectedModifiers: {
              create: item.selectedModifiers || []
            }
          })),
        },
      },
      include: {
        items: {
          include: { 
            menuItem: true,
            selectedModifiers: true 
          },
        },
        table: true,
        waiter: { select: { name: true } },
      },
    });

    // 3. Update table status to OCCUPIED
    await prisma.table.update({
      where: { id: tableId },
      data: { status: 'OCCUPIED' },
    });

    // 4. Emit socket event to Kitchen
    io.emit('new_order', order);

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
};

export const updateOrderStatus = async (req: any, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const io = req.app.get('io');

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { 
        table: true, 
        waiter: { select: { name: true } },
        items: { include: { menuItem: true, selectedModifiers: true } }
      },
    });

    // AUTO-DEDUCT INVENTORY: When status becomes PREPARING
    if (status === 'PREPARING') {
      try {
        for (const item of order.items) {
          // Check if this item has inventory tracking
          const inventory = await prisma.inventory.findUnique({
            where: { menuItemId: item.menuItemId }
          });

          if (inventory) {
            await prisma.inventory.update({
              where: { id: inventory.id },
              data: { stock: { decrement: item.quantity } }
            });
          }
        }
      } catch (invError) {
        console.error('[Inventory Deduction Error]:', invError);
        // We don't fail the order status update if inventory deduction fails, 
        // but it should be logged/notified.
      }
    }

    // Emit socket event for real-time updates (Waiter sees this)
    io.emit('order_status_update', order);

    res.status(200).json(order);
  } catch (error) {
    console.error('[updateOrderStatus Error]:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

export const getOrdersByStatus = async (req: Request, res: Response) => {
  const { status } = req.params;
  try {
    const orders = await prisma.order.findMany({
      where: status !== 'ALL' ? { status: status as any } : {},
      include: {
        items: { include: { menuItem: true, selectedModifiers: true } },
        table: true,
        waiter: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

export const getMyOrders = async (req: any, res: Response) => {
  const waiterId = req.user.id;
  try {
    const orders = await prisma.order.findMany({
      where: { waiterId },
      include: {
        items: { include: { menuItem: true, selectedModifiers: true } },
        table: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching my orders' });
  }
};

// Table Management
export const getTables = async (req: Request, res: Response) => {
  try {
    const tables = await prisma.table.findMany();
    res.status(200).json(tables);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tables' });
  }
};

export const createTable = async (req: Request, res: Response) => {
  const { number, capacity } = req.body;
  try {
    const table = await prisma.table.create({ data: { number, capacity } });
    res.status(201).json(table);
  } catch (error) {
    res.status(500).json({ message: 'Error creating table' });
  }
};
export const getMyShiftSales = async (req: any, res: Response) => {
  const waiterId = req.user.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const orders = await prisma.order.findMany({
      where: {
        waiterId,
        status: 'PAID',
        createdAt: { gte: today }
      }
    });

    const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    const orderCount = orders.length;

    res.json({ totalSales, orderCount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shift sales' });
  }
};

export const confirmPayment = async (req: any, res: Response) => {
  const { id } = req.params;
  const { method, payments } = req.body; // method (fallback), payments: Array<{ method, amount }>
  const io = req.app.get('io');

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { table: true, payments: true }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const paymentData = payments && Array.isArray(payments) ? payments : [{ method, amount: order.totalAmount }];
      
      // 1. Create payment records
      for (const p of paymentData) {
        await tx.payment.create({
          data: {
            orderId: id,
            amount: Number(p.amount),
            method: p.method,
            status: 'COMPLETED',
            reference: `POS-${Math.random().toString(36).substring(7).toUpperCase()}`,
            details: JSON.stringify({ confirmedBy: req.user.name || req.user.id })
          }
        });
      }

      // 2. Check total paid
      const allPayments = await tx.payment.findMany({ where: { orderId: id, status: 'COMPLETED' } });
      const totalPaid = allPayments.reduce((acc, p) => acc + Number(p.amount), 0);
      const isFullyPaid = totalPaid >= Number(order.totalAmount);

      // 3. Update order status if fully paid
      const updated = await tx.order.update({
        where: { id },
        data: { status: isFullyPaid ? 'PAID' : order.status },
        include: { table: true, waiter: { select: { name: true } }, items: { include: { menuItem: true } } }
      });

      // 4. Release table if fully paid
      if (isFullyPaid && updated.tableId) {
        await tx.table.update({
          where: { id: updated.tableId },
          data: { status: 'AVAILABLE' }
        });
      }

      return updated;
    });

    io.emit('order_status_update', updatedOrder);
    if (updatedOrder.status === 'PAID') io.emit('tables_update');

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('[confirmPayment Error]:', error);
    res.status(500).json({ message: 'Error confirming payment' });
  }
};

export const markOrderAsUnpaid = async (req: any, res: Response) => {
  const { id } = req.params;
  const io = req.app.get('io');

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { table: true }
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'PAID') return res.status(400).json({ message: 'Order is not paid' });

    // Check if table is already re-occupied
    if (order.tableId) {
      const table = await prisma.table.findUnique({ where: { id: order.tableId } });
      if (table && table.status !== 'AVAILABLE') {
        return res.status(400).json({ 
          message: `Cannot revert. Table ${table.number} is currently ${table.status}` 
        });
      }
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Delete associated payments
      await tx.payment.deleteMany({
        where: { orderId: id }
      });

      // 2. Revert order status (to SERVED so it can be settled again)
      const ord = await tx.order.update({
        where: { id },
        data: { status: 'SERVED' },
        include: { table: true, waiter: true }
      });

      // 3. Set table back to OCCUPIED
      if (ord.tableId) {
        await tx.table.update({
          where: { id: ord.tableId },
          data: { status: 'OCCUPIED' }
        });
      }

      return ord;
    });

    // Notify clients
    io.emit('order_status_update', updatedOrder);
    io.emit('tables_update');

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('[markOrderAsUnpaid Error]:', error);
    res.status(500).json({ message: 'Error reverting payment' });
  }
};
