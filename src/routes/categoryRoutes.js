import express from 'express';
import { body, param } from 'express-validator';
import {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(getCategories)
  .post(
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
    createCategory
  );

router
  .route('/:id')
  .get(
    [param('id').notEmpty().withMessage('Category ID is required'), validateRequest],
    getCategoryById
  )
  .put(
    protect,
    admin,
    [param('id').notEmpty().withMessage('Category ID is required'), validateRequest],
    updateCategory
  )
  .delete(
    protect,
    admin,
    [param('id').notEmpty().withMessage('Category ID is required'), validateRequest],
    deleteCategory
  );

export default router;
