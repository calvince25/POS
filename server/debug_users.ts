import prisma from './src/services/prisma';

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true }
  });
  console.log('All Users and Roles:');
  users.forEach(u => {
    console.log(`- ${u.name} (@${u.username}) -> Role: ${u.role.name}`);
  });
}

main();
