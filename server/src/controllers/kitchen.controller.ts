import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export const getKitchenAnalytics = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // 1. Total orders prepared today
    const completedOrdersCount = await prisma.order.count({
      where: {
        status: { in: ['READY', 'SERVED', 'PAID'] },
        createdAt: { gte: start, lte: end }
      }
    });

    // 2. Pending/Preparing count
    const activeOrdersCount = await prisma.order.count({
      where: {
        status: { in: ['PENDING', 'PREPARING'] }
      }
    });

    // 3. Most prepared items (Top 5)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: ['READY', 'SERVED', 'PAID'] },
          createdAt: { gte: start, lte: end }
        }
      },
      include: { 
        menuItem: true,
        order: true // Include order to access createdAt
      }
    });

    const itemCounts: Record<string, { name: string, count: number }> = {};
    orderItems.forEach(oi => {
      const id = oi.menuItemId;
      if (!itemCounts[id]) {
        itemCounts[id] = { name: oi.menuItem.name, count: 0 };
      }
      itemCounts[id].count += oi.quantity;
    });

    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Hourly distribution (simulated for chart)
    const hourlyData = [];
    for (let i = 0; i < 24; i++) {
        const hStart = new Date(start);
        hStart.setHours(i);
        const hEnd = new Date(start);
        hEnd.setHours(i + 1);

        const count = orderItems.filter(oi => {
            const date = new Date(oi.order.createdAt);
            return date >= hStart && date < hEnd;
        }).length;
        
        if (i >= 8 && i <= 22) { // Only business hours for the chart
            hourlyData.push({ hour: `${i}:00`, orders: count });
        }
    }

    res.status(200).json({
      summary: {
        completedToday: completedOrdersCount,
        activeNow: activeOrdersCount,
        efficiency: "92%" // Placeholder or calculated from prep times
      },
      topItems,
      hourlyData
    });
  } catch (error) {
    console.error('[getKitchenAnalytics Error]:', error);
    res.status(500).json({ message: 'Error fetching kitchen analytics' });
  }
};
