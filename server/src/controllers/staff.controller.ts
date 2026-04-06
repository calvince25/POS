import { Request, Response } from 'express';
import prisma from '../services/prisma';
import bcrypt from 'bcrypt';

export const getAllStaff = async (req: Request, res: Response) => {
  try {
    const staff = await prisma.user.findMany({
      include: { role: true },
      where: { role: { name: { not: 'OWNER' } } }, // Exclude owner from staff list
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff' });
  }
};

export const updateStaffStatus = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;
  try {
    const staff = await prisma.user.update({
      where: { id: id as string },
      data: { status },
    });
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Error updating staff status' });
  }
};

export const resetStaffPassword = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { newPassword } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: id as string },
      data: { password: hashedPassword },
    });
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const updateStaffRole = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { roleName } = req.body;
  
  try {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const staff = await prisma.user.update({
      where: { id: id as string },
      data: { roleId: role.id },
      include: { role: true }
    });
    
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: 'Error updating staff role' });
  }
};

// Shifts / Duty Roster
export const getShifts = async (req: Request, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { date: 'asc' },
    });
    res.status(200).json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shifts' });
  }
};

export const createShift = async (req: Request, res: Response) => {
  const { userId, date, role, startTime, endTime } = req.body;
  try {
    const shift = await prisma.shift.create({
      data: {
        userId,
        date: new Date(date),
        role,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
      },
    });
    res.status(201).json(shift);
  } catch (error: any) {
    console.error('[createShift Error]:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'A shift already exists for this staff member on this date.' });
    }
    res.status(500).json({ message: 'Error creating shift. Please try again.' });
  }
};

export const getMyShifts = async (req: any, res: Response) => {
  const userId = req.user.id;
  try {
    const shifts = await prisma.shift.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
    res.status(200).json(shifts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching current user shifts' });
  }
};

export const updateShift = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role, startTime, endTime } = req.body;
  try {
    const shift = await prisma.shift.update({
      where: { id: id as string },
      data: {
        role,
        startTime: startTime ? new Date(startTime) : null,
        endTime:   endTime   ? new Date(endTime)   : null,
      },
    });
    res.status(200).json(shift);
  } catch (error: any) {
    console.error('[updateShift Error]:', error);
    res.status(500).json({ message: 'Error updating shift. Please try again.' });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Delete related shifts first to avoid foreign key constraints
    await prisma.shift.deleteMany({ where: { userId: id } });

    // Delete the user
    await prisma.user.delete({ where: { id } });

    res.status(200).json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('[deleteStaff Error]:', error);
    res.status(500).json({ message: 'Error deleting staff member' });
  }
};
