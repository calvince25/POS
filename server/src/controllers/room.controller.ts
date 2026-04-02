import { Request, Response } from 'express';
import prisma from '../services/prisma';

export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        bookings: {
          where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          include: { receptionist: { select: { name: true } } }
        }
      },
      orderBy: { number: 'asc' }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms' });
  }
};

export const getLodgingReport = async (_req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  try {
    // All active bookings (confirmed or checked-in)
    const activeBookings = await prisma.booking.findMany({
      where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] }, updatedAt: { gte: today } },
      include: { room: true },
    });

    // Revenue from bookings that were checked-out today OR that are checked-in (already paid/pending)
    const todayRevenue = activeBookings
      .filter(b => b.status === 'CHECKED_OUT' || b.status === 'CHECKED_IN')
      .reduce((acc, b) => acc + Number(b.totalAmount), 0);

    // Breakdown by room type
    const perType: Record<string, number> = {};
    activeBookings.forEach(b => {
      const t = b.room.type;
      perType[t] = (perType[t] || 0) + Number(b.totalAmount);
    });

    // Room occupancy totals
    const rooms = await prisma.room.findMany();
    const occupancy = {
      total:       rooms.length,
      available:   rooms.filter(r => r.status === 'AVAILABLE').length,
      occupied:    rooms.filter(r => r.status === 'OCCUPIED').length,
      reserved:    rooms.filter(r => r.status === 'RESERVED').length,
      cleaning:    rooms.filter(r => r.status === 'CLEANING').length,
      maintenance: rooms.filter(r => r.status === 'MAINTENANCE').length,
    };

    // Recent bookings
    const recentBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { room: true, receptionist: { select: { name: true } } },
    });

    res.json({ todayRevenue, perType, occupancy, recentBookings, totalBookings: activeBookings.length });
  } catch (error) {
    res.status(500).json({ message: 'Error generating lodging report' });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { price, amenities, type } = req.body;
  try {
    const room = await prisma.room.update({
      where: { id: id as string },
      data: {
        ...(price !== undefined && { price: Number(price) }),
        ...(amenities !== undefined && { amenities }),
        ...(type !== undefined && { type }),
      }
    });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error updating room' });
  }
};

export const updateRoomStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const room = await prisma.room.update({ where: { id: id as string }, data: { status } });
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Error updating room status' });
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        room: true,
        receptionist: { select: { name: true } },
        payments: true
      },
      orderBy: { checkIn: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

export const createBooking = async (req: Request, res: Response) => {
  const { guestName, guestPhone, roomId, checkIn, checkOut, totalAmount, notes } = req.body;
  const userId = (req as any).user.id;

  try {
    // Verify room exists and is available
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.status !== 'AVAILABLE') {
      return res.status(400).json({ message: `Room ${room.number} is not available (status: ${room.status})` });
    }

    const checkInDate  = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.max(
      Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000),
      1
    );
    const calculatedTotal = totalAmount ? Number(totalAmount) : room.price * nights;

    const booking = await prisma.booking.create({
      data: {
        guestName,
        guestPhone,
        roomId,
        userId,
        checkIn:     checkInDate,
        checkOut:    checkOutDate,
        totalAmount: calculatedTotal,
        notes,
        status: 'CONFIRMED'
      },
      include: { room: true }
    });

    // Mark room as RESERVED immediately after booking
    await prisma.room.update({
      where: { id: roomId },
      data:  { status: 'RESERVED' }
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const booking = await prisma.booking.update({
      where: { id: id as string },
      data: { status },
      include: { room: true }
    });

    let roomStatus: 'AVAILABLE' | 'OCCUPIED' | 'CLEANING' | 'MAINTENANCE' | 'RESERVED' = 'AVAILABLE';
    if (status === 'CHECKED_IN') roomStatus = 'OCCUPIED';
    if (status === 'CHECKED_OUT') roomStatus = 'CLEANING';
    if (status === 'CANCELLED' || status === 'COMPLETED') roomStatus = 'AVAILABLE';

    await prisma.room.update({
      where: { id: booking.roomId },
      data: { status: roomStatus }
    });

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking status' });
  }
};

export const createRoom = async (req: Request, res: Response) => {
  const { number, type, price, amenities } = req.body;
  try {
    const existingRoom = await prisma.room.findUnique({ where: { number } });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room number already exists' });
    }

    const room = await prisma.room.create({
      data: {
        number,
        type: type || 'Single',
        price: Number(price),
        amenities: amenities || '',
        status: 'AVAILABLE'
      }
    });
    res.status(201).json(room);
  } catch (error) {
    console.error('[createRoom Error]:', error);
    res.status(500).json({ message: 'Error creating room' });
  }
};

export const deleteRoom = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Check if the room has any active bookings before deleting
    const activeBookings = await prisma.booking.findFirst({
      where: {
        roomId: id as string,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] }
      }
    });

    if (activeBookings) {
      return res.status(400).json({ message: 'Cannot delete room with active bookings' });
    }

    // Delete associated bookings first (cascade not set on schema)
    await prisma.booking.deleteMany({
      where: { roomId: id as string }
    });

    await prisma.room.delete({
      where: { id: id as string }
    });

    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting room' });
  }
};

