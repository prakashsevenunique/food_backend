import express from 'express';
import { body, param } from 'express-validator';
import {
  getCategories,
  getCategoryById,
  deleteCategory,
  createCategoryTextOnly,
  updateCategoryTextOnly,
  updateCategoryImageOnly
} from '../controllers/categoryController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import upload from '../config/multer.js';

const router = express.Router();

// GET all categories
router.get('/', getCategories);

// CREATE category text-only
router.post(
  '/',
  protect,
  admin,
  [
    body('name').notEmpty().withMessage('Category name is required'),
    body('type')
      .optional()
      .isIn(['cuisine', 'food-type', 'meal-time'])
      .withMessage('Type must be cuisine, food-type, or meal-time'),
    validateRequest,
  ],
  createCategoryTextOnly
);

// UPLOAD category image
router.put(
  '/:id/photo',
  protect,
  admin,
  upload.single('image'),
  updateCategoryImageOnly
);

// GET category by ID
router.get(
  '/:id',
  [param('id').notEmpty().withMessage('Category ID is required'), validateRequest],
  getCategoryById
);

// UPDATE category text-only
router.put(
  '/:id',
  protect,
  admin,
  [
    param('id').notEmpty().withMessage('Category ID is required'),
    validateRequest,
  ],
  updateCategoryTextOnly
);

// DELETE category
router.delete(
  '/:id',
  protect,
  admin,
  [param('id').notEmpty().withMessage('Category ID is required'), validateRequest],
  deleteCategory
);

export default router;
