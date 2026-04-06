import { Request, Response } from 'express';
import prisma from '../services/prisma';

export const getInventory = async (req: Request, res: Response) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            price: true,
            category: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.status(200).json(inventory);
  } catch (error) {
    console.error('[getInventory Error]:', error);
    res.status(500).json({ message: 'Error fetching inventory' });
  }
};

export const createInventoryItem = async (req: any, res: Response) => {
  const { menuItemId, customName, stock, minStock, unit } = req.body;
  
  try {
    // Check if a linked inventory already exists
    if (menuItemId) {
      const existing = await prisma.inventory.findUnique({ where: { menuItemId } });
      if (existing) return res.status(400).json({ message: 'Inventory for this menu item already exists.' });
    }

    const item = await prisma.inventory.create({
      data: {
        menuItemId: menuItemId || null,
        customName: customName || null,
        stock: Number(stock || 0),
        minStock: Number(minStock || 5),
        unit: unit || 'pcs'
      },
      include: { menuItem: true }
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('[createInventoryItem Error]:', error);
    res.status(500).json({ message: 'Error creating inventory item' });
  }
};

export const updateInventory = async (req: any, res: Response) => {
  const id = req.params.id as string;
  const { stock, allocated, minStock, unit } = req.body;
  
  try {
    const updated = await prisma.inventory.update({
      where: { id },
      data: {
        stock: stock !== undefined ? Number(stock) : undefined,
        allocated: allocated !== undefined ? Number(allocated) : undefined,
        minStock: minStock !== undefined ? Number(minStock) : undefined,
        unit: unit || undefined
      }
    });
    res.status(200).json(updated);
  } catch (error) {
    console.error('[updateInventory Error]:', error);
    res.status(500).json({ message: 'Error updating inventory' });
  }
};

export const replenishInventory = async (req: any, res: Response) => {
  // Supports both /replenish/:menuItemId and /replenish (body-based)
  const menuItemIdParam = req.params.menuItemId as string | undefined;
  const { amount, isAllocation, menuItemId: bodyMenuItemId, customName } = req.body;
  const menuItemId = menuItemIdParam || bodyMenuItemId;

  try {
    const amountNum = Number(amount);
    const unit = req.body.unit || 'pcs';

    // Case 1: custom/general item (no menuItemId)
    if (!menuItemId && customName) {
      const created = await prisma.inventory.create({
        data: { customName, stock: amountNum, allocated: amountNum, unit }
      });
      return res.status(201).json(created);
    }

    if (!menuItemId) {
      return res.status(400).json({ message: 'menuItemId or customName required' });
    }

    // Case 2: menu-linked item
    const existing = await prisma.inventory.findUnique({ where: { menuItemId } });

    if (existing) {
      const updated = await prisma.inventory.update({
        where: { menuItemId },
        data: {
          stock: isAllocation ? amountNum : { increment: amountNum },
          allocated: isAllocation ? amountNum : { increment: amountNum }
        }
      });
      return res.status(200).json(updated);
    } else {
      const created = await prisma.inventory.create({
        data: { menuItemId, stock: amountNum, allocated: amountNum, unit }
      });
      return res.status(201).json(created);
    }
  } catch (error) {
    console.error('[replenishInventory Error]:', error);
    res.status(500).json({ message: 'Error replenishing inventory' });
  }
};

export const deleteInventory = async (req: any, res: Response) => {
  const id = req.params.id as string;
  try {
    await prisma.inventory.delete({ where: { id } });
    res.status(200).json({ message: 'Inventory item removed' });
  } catch (error) {
    console.error('[deleteInventory Error]:', error);
    res.status(500).json({ message: 'Error deleting inventory item' });
  }
};
