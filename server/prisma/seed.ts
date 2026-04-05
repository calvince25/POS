import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Roles
  const roles = [
    { name: 'OWNER' },
    { name: 'MANAGER' },
    { name: 'WAITER' },
    { name: 'KITCHEN' },
    { name: 'RECEPTIONIST' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }

  const managerRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } });
  const waiterRole = await prisma.role.findUnique({ where: { name: 'WAITER' } });
  const kitchenRole = await prisma.role.findUnique({ where: { name: 'KITCHEN' } });
  const receptionRole = await prisma.role.findUnique({ where: { name: 'RECEPTIONIST' } });

  // 2. Create Initial Manager
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      name: 'System Admin',
      username: 'admin',
      password: hashedPassword,
      roleId: managerRole!.id,
    },
  });

  // 3. Create Sample Waiter
  await prisma.user.upsert({
    where: { username: 'waiter1' },
    update: {},
    create: {
      name: 'John Waiter',
      username: 'waiter1',
      password: hashedPassword,
      roleId: waiterRole!.id,
    },
  });

  // 4. Create Sample Kitchen Staff
  await prisma.user.upsert({
    where: { username: 'chef1' },
    update: {},
    create: {
      name: 'Chef Mario',
      username: 'chef1',
      password: hashedPassword,
      roleId: kitchenRole!.id,
    },
  });

  // 4b. Create Sample Receptionist
  await prisma.user.upsert({
    where: { username: 'reception1' },
    update: {},
    create: {
      name: 'Sarah Reception',
      username: 'reception1',
      password: hashedPassword,
      roleId: receptionRole!.id,
    },
  });

  // 5. Create Categories
  const categories = ['Main Course', 'Appetizers', 'Drinks', 'Desserts'];
  for (const name of categories) {
    let cat = await prisma.category.findFirst({ where: { name } });
    if (!cat) {
      await prisma.category.create({ data: { name } });
    }
  }

  const mainCategory = await prisma.category.findFirst({ where: { name: 'Main Course' } });
  const drinksCategory = await prisma.category.findFirst({ where: { name: 'Drinks' } });

  // 6. Create Menu Items
  const menuItems = [
    { name: 'Grilled Salmon', price: 1850, categoryId: mainCategory!.id, isAvailable: true, description: 'Fresh Atlantic salmon with herbs' },
    { name: 'Beef Steak', price: 2100, categoryId: mainCategory!.id, isAvailable: true, description: 'Prime beef steak medium rare' },
    { name: 'Fresh Passion Juice', price: 350, categoryId: drinksCategory!.id, isAvailable: true, description: 'Freshly squeezed passion fruit' },
    { name: 'Cold Heineken', price: 450, categoryId: drinksCategory!.id, isAvailable: true, description: 'Chilled premium lager' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { name: item.name },
      update: {},
      create: item,
    });
  }

  // 7. Create Tables
  for (let i = 1; i <= 8; i++) {
    await prisma.table.upsert({
      where: { number: i.toString() },
      update: {},
      create: { number: i.toString(), capacity: 4 },
    });
  }

  // 8. Create Rooms (Lodgings)
  const roomTypes = ['Single', 'Double', 'Deluxe', 'Suite'];
  for (let i = 101; i <= 110; i++) {
    const type = roomTypes[Math.floor(Math.random() * roomTypes.length)];
    const price = type === 'Suite' ? 12000 : type === 'Deluxe' ? 8000 : type === 'Double' ? 5000 : 3000;
    
    await prisma.room.upsert({
      where: { number: i.toString() },
      update: {},
      create: {
        number: i.toString(),
        type,
        price,
        status: (i === 101) ? 'OCCUPIED' : 'AVAILABLE'
      },
    });
  }

  // 9. Sample Booking for Room 101
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  const room101 = await prisma.room.findUnique({ where: { number: '101' } });
  
  if (admin && room101) {
    const existingBooking = await prisma.booking.findFirst({ where: { roomId: room101.id }});
    if (!existingBooking) {
      await prisma.booking.create({
        data: {
          guestName: 'Jane Doe',
          guestPhone: '+254700000000',
          roomId: room101.id,
          userId: admin.id,
          checkIn: new Date(),
          checkOut: new Date(Date.now() + 86400000 * 2), // 2 days from now
          status: 'CHECKED_IN',
          totalAmount: room101.price * 2,
          notes: 'VIP Guest'
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
