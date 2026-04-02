import { Request, Response } from 'express';
import prisma from '../services/prisma';

// Hierarchical Menus
export const getAllMenus = async (req: Request, res: Response) => {
  try {
    const menus = await prisma.menu.findMany({
      include: {
        categories: {
          include: {
            subCategories: true,
            items: {
              include: {
                modifiers: true
              }
            }
          }
        }
      }
    });
    res.status(200).json(menus);
  } catch (error) {
    console.error('[getAllMenus Error]:', error);
    res.status(500).json({ message: 'Error fetching hierarchical menus' });
  }
};

export const createMenu = async (req: Request, res: Response) => {
  const { name, description } = req.body;
  try {
    const menu = await prisma.menu.create({
      data: { name, description }
    });
    res.status(201).json(menu);
  } catch (error) {
    res.status(500).json({ message: 'Error creating menu' });
  }
};

export const updateMenu = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const menu = await prisma.menu.update({
      where: { id: id as string },
      data: { name, description }
    });
    res.status(200).json(menu);
  } catch (error) {
    res.status(500).json({ message: 'Error updating menu' });
  }
};

export const deleteMenu = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.menu.delete({ where: { id: id as string } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting menu' });
  }
};

// Menu Items
export const getAllMenuItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.menuItem.findMany({
      include: { 
        category: true,
        subCategory: true,
        modifiers: true
      },
    });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu items' });
  }
};

export const createMenuItem = async (req: any, res: Response) => {
  const { name, description, price, categoryId, subCategoryId, isAvailable, modifiers } = req.body;
  const imagePath = req.file ? `/public/uploads/${req.file.filename}` : req.body.image;

  try {
    const parsedModifiers = typeof modifiers === 'string' ? JSON.parse(modifiers) : modifiers;

    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: Number(price),
        categoryId: categoryId || null,
        subCategoryId: subCategoryId || null,
        isAvailable: isAvailable === 'true' || isAvailable === true,
        image: imagePath,
        modifiers: parsedModifiers && Array.isArray(parsedModifiers) ? {
          create: parsedModifiers.map((m: any) => ({
            name: m.name,
            price: Number(m.price || 0)
          }))
        } : undefined
      },
      include: { modifiers: true }
    });
    res.status(201).json(item);
  } catch (error: any) {
    console.error('[createMenuItem Error]:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Menu item name already exists.' });
    }
    res.status(500).json({ message: 'Error creating menu item' });
  }
};

export const updateMenuItem = async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, description, price, categoryId, subCategoryId, isAvailable, modifiers } = req.body;
  const imagePath = req.file ? `/public/uploads/${req.file.filename}` : req.body.image;

  try {
    const parsedModifiers = typeof modifiers === 'string' ? JSON.parse(modifiers) : modifiers;

    if (parsedModifiers && Array.isArray(parsedModifiers)) {
      await prisma.modifier.deleteMany({ where: { menuItemId: id } });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description,
        price: Number(price),
        categoryId: categoryId || null,
        subCategoryId: subCategoryId || null,
        isAvailable: isAvailable === 'true' || isAvailable === true,
        image: imagePath,
        modifiers: parsedModifiers && Array.isArray(parsedModifiers) ? {
          create: parsedModifiers.map((m: any) => ({
            name: m.name,
            price: Number(m.price || 0)
          }))
        } : undefined
      },
      include: { modifiers: true }
    });
    res.status(200).json(item);
  } catch (error: any) {
    console.error('[updateMenuItem Error]:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Menu item name already exists.' });
    }
    res.status(500).json({ message: 'Error updating menu item' });
  }
};

export const deleteMenuItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.menuItem.delete({ where: { id: id as string } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting menu item' });
  }
};

// Categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: { 
        subCategories: true, 
        menu: true,
        items: {
          include: {
            modifiers: true
          }
        }
      }
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

export const createCategory = async (req: any, res: Response) => {
  const { name, menuId } = req.body;
  const imagePath = req.file ? `/public/uploads/${req.file.filename}` : (req.body.image as string);
  try {
    const category = await prisma.category.create({ 
      data: { 
        name,
        menuId: menuId || null,
        image: imagePath 
      } 
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('[createCategory Error]:', error);
    res.status(500).json({ message: 'Error creating category' });
  }
};

export const updateCategory = async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, menuId } = req.body;
  const imagePath = req.file ? `/public/uploads/${req.file.filename}` : (req.body.image as string);
  try {
    const category = await prisma.category.update({
      where: { id: id as string },
      data: { 
        name,
        menuId: menuId || null,
        image: imagePath 
      },
    });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Error updating category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.category.delete({ where: { id: id as string } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting category' });
  }
};

// SubCategories
export const getAllSubCategories = async (req: Request, res: Response) => {
  try {
    const subCategories = await prisma.subCategory.findMany({
      include: { category: true }
    });
    res.status(200).json(subCategories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subcategories' });
  }
};

export const createSubCategory = async (req: any, res: Response) => {
  const { name, categoryId } = req.body;
  const imagePath = req.file ? `/public/uploads/${req.file.filename}` : (req.body.image as string);
  try {
    const subCategory = await prisma.subCategory.create({
      data: {
        name,
        categoryId,
        image: imagePath
      }
    });
    res.status(201).json(subCategory);
  } catch (error) {
    console.error('[createSubCategory Error]:', error);
    res.status(500).json({ message: 'Error creating subcategory' });
  }
};

export const updateSubCategory = async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, categoryId } = req.body;
  const imagePath = req.file ? `/public/uploads/${req.file.filename}` : (req.body.image as string);
  try {
    const subCategory = await prisma.subCategory.update({
      where: { id },
      data: {
        name,
        categoryId,
        image: imagePath
      }
    });
    res.status(200).json(subCategory);
  } catch (error) {
    res.status(500).json({ message: 'Error updating subcategory' });
  }
};

export const deleteSubCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.subCategory.delete({ where: { id: id as string } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subcategory' });
  }
};
