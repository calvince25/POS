import { Router } from 'express';
import { 
  getAllMenuItems, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem, 
  getAllCategories, 
  createCategory,
  updateCategory,
  deleteCategory,
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getAllSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
} from '../controllers/menu.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { upload } from '../middleware/multer';

const router = Router();

// Hierarchical Menus
router.get('/menus', authenticate, getAllMenus);
router.post('/menus', authenticate, authorize(['MANAGER', 'OWNER']), createMenu);
router.put('/menus/:id', authenticate, authorize(['MANAGER', 'OWNER']), updateMenu);
router.delete('/menus/:id', authenticate, authorize(['MANAGER', 'OWNER']), deleteMenu);

// Categories
router.get('/categories', authenticate, getAllCategories);
router.post('/categories', authenticate, authorize(['MANAGER', 'OWNER']), upload.single('image'), createCategory);
router.put('/categories/:id', authenticate, authorize(['MANAGER', 'OWNER']), upload.single('image'), updateCategory);
router.delete('/categories/:id', authenticate, authorize(['MANAGER', 'OWNER']), deleteCategory);

// SubCategories
router.get('/subcategories', authenticate, getAllSubCategories);
router.post('/subcategories', authenticate, authorize(['MANAGER', 'OWNER']), upload.single('image'), createSubCategory);
router.put('/subcategories/:id', authenticate, authorize(['MANAGER', 'OWNER']), upload.single('image'), updateSubCategory);
router.delete('/subcategories/:id', authenticate, authorize(['MANAGER', 'OWNER']), deleteSubCategory);

// Menu Items
router.get('/items', authenticate, getAllMenuItems);
router.post('/items', authenticate, authorize(['MANAGER', 'OWNER']), upload.single('image'), createMenuItem);
router.put('/items/:id', authenticate, authorize(['MANAGER', 'OWNER']), upload.single('image'), updateMenuItem);
router.delete('/items/:id', authenticate, authorize(['MANAGER', 'OWNER']), deleteMenuItem);

export default router;
