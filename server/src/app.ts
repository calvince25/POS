import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import roomRoutes from './routes/room.routes';
import orderRoutes from './routes/order.routes';
import staffRoutes from './routes/staff.routes';
import paymentRoutes from './routes/payment.routes';
import messageRoutes from './routes/message.routes';
import inventoryRoutes from './routes/inventory.routes';
import kitchenRoutes from './routes/kitchen.routes';
import prisma from './services/prisma';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '../public')));

// Socket.io injection
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/kitchen', kitchenRoutes);

// Auto-seed: Ensure default users exist (handles Vercel serverless resets)
async function ensureDefaultUsers() {
  try {
    const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!adminExists) {
      console.log('No users found. Running auto-seed...');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      // Create roles first
      const roleNames = ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN', 'RECEPTIONIST'];
      for (const name of roleNames) {
        await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
      }

      const managerRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } });
      const waiterRole = await prisma.role.findUnique({ where: { name: 'WAITER' } });
      const kitchenRole = await prisma.role.findUnique({ where: { name: 'KITCHEN' } });
      const receptionRole = await prisma.role.findUnique({ where: { name: 'RECEPTIONIST' } });

      await prisma.user.upsert({ where: { username: 'admin' }, update: {}, create: { name: 'System Admin', username: 'admin', password: hashedPassword, roleId: managerRole!.id } });
      await prisma.user.upsert({ where: { username: 'waiter1' }, update: {}, create: { name: 'John Waiter', username: 'waiter1', password: hashedPassword, roleId: waiterRole!.id } });
      await prisma.user.upsert({ where: { username: 'chef1' }, update: {}, create: { name: 'Chef Mario', username: 'chef1', password: hashedPassword, roleId: kitchenRole!.id } });
      await prisma.user.upsert({ where: { username: 'reception1' }, update: {}, create: { name: 'Sarah Reception', username: 'reception1', password: hashedPassword, roleId: receptionRole!.id } });

      console.log('Auto-seed complete. Default users created.');
    }
  } catch (err) {
    console.error('Auto-seed error:', err);
  }
}

// Run auto-seed immediately when app loads (non-blocking)
ensureDefaultUsers();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('join_room', (room) => { socket.join(room); });
  socket.on('disconnect', () => { console.log('User disconnected:', socket.id); });
});

export { app, server, io };
