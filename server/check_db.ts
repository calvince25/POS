import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  try {
    const userCount = await prisma.user.count();
    console.log('Total Users:', userCount);
    const users = await prisma.user.findMany({
      include: { role: true },
      take: 5
    });
    console.log('Users Found:', users.map(u => ({ username: u.username, role: u.role.name })));
  } catch (err) {
    console.error('Error connecting to DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
