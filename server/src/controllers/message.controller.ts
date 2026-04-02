import { Request, Response } from 'express';
import prisma from '../services/prisma';

export const getMessages = async (req: any, res: Response) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { recipientId: userId },
          { isBroadcast: true }, // Simple broadcast logic: everyone sees it
          { senderId: userId },  // Also fetch messages sent by the user
        ],
      },
      include: {
        sender: {
          select: { name: true, role: { select: { name: true } } },
        },
        recipient: {
          select: { name: true, role: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
};

export const sendMessage = async (req: any, res: Response) => {
  const senderId = req.user.id;
  const { content, recipientId, isBroadcast } = req.body;

  try {
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        recipientId: isBroadcast ? null : recipientId,
        isBroadcast: isBroadcast ?? false,
      },
    });

    // Notify via socket.io if needed
    const io = req.app.get('io');
    if (isBroadcast) {
      io.emit('new_broadcast_message', message);
    } else if (recipientId) {
      io.to(recipientId).emit('new_direct_message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message' });
  }
};
