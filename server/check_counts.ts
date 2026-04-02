import prisma from './src/services/prisma';
async function check() {
  try {
    const mc = await prisma.menu.count();
    const cc = await prisma.category.count();
    const sc = await prisma.subCategory.count();
    const ic = await prisma.menuItem.count();
    console.log(JSON.stringify({ menus: mc, categories: cc, subcategories: sc, items: ic }));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
